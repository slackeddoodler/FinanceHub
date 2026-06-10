"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ICategoryRepository, ISpendRepository } from "../../domain/interfaces/repositories";
import { SupabaseCategoryRepository } from "../../data/repositories/SupabaseCategoryRepository";
import { SupabaseSpendRepository } from "../../data/repositories/SupabaseSpendRepository";

interface AppContextType {
  categoryRepo: ICategoryRepository | null;
  spendRepo: ISpendRepository | null;
  isDbReady: boolean;
  isAuthenticated: boolean;
  logoutUser: () => Promise<void>;
  userRole: "admin" | "user";
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // 1. Hook into NextAuth to read the secure browser cookie
  const { data: session, status } = useSession();

  const [categoryRepo, setCategoryRepo] = useState<ICategoryRepository | null>(null);
  const [spendRepo, setSpendRepo] = useState<ISpendRepository | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  // 2. Derive state directly from NextAuth's secure backend validation
  const isAuthenticated = status === "authenticated";
  
  // Extract the role from the token (defaults to "user" if undefined)
  const userRole = (session?.user?.role as "admin" | "user") || "user";

  // 3. Supabase Initialization
  useEffect(() => {
    // Supabase is cloud-hosted and instantly ready. 
    // We instantiate the repositories immediately on mount.
    setCategoryRepo(new SupabaseCategoryRepository());
    setSpendRepo(new SupabaseSpendRepository());
    setIsDbReady(true);
  }, []);

  // 4. Secure Logout via NextAuth
  const logoutUser = async () => {
    // This securely destroys the cookie and redirects the user to the root/login
    await signOut({ callbackUrl: "/" });
  };

  return (
    <AppContext.Provider value={{ 
      categoryRepo, 
      spendRepo, 
      isDbReady, 
      isAuthenticated, 
      logoutUser, 
      userRole 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
}