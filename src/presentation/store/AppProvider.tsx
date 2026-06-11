"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
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
  const { data: session, status } = useSession();
  const pathname = usePathname();
  
  const [isDbReady, setIsDbReady] = useState(false);
  const [repos, setRepos] = useState<{
    companyCategory: ICategoryRepository | null,
    companySpend: ISpendRepository | null,
    personalCategory: ICategoryRepository | null,
    personalSpend: ISpendRepository | null,
  }>({
    companyCategory: null, companySpend: null, personalCategory: null, personalSpend: null
  });

  const isAuthenticated = status === "authenticated";
  const userRole = (session?.user?.role as "admin" | "user") || "user";
  
  // Calculate Scope: If URL contains /personal, switch the entire app's database targeting
  const appScope = pathname?.startsWith('/personal') ? "personal" : "company";

  useEffect(() => {
    if (status !== "loading") {
      // Safely extract the UUID from the session (requires NextAuth callbacks to expose user.id)
      const userId = (session?.user as any)?.id || null;
      
      setRepos({
        companyCategory: new SupabaseCategoryRepository(false),
        companySpend: new SupabaseSpendRepository(false),
        personalCategory: new SupabaseCategoryRepository(true, userId),
        personalSpend: new SupabaseSpendRepository(true, userId)
      });
      setIsDbReady(true);
    }
  }, [status, session]);

  const logoutUser = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const activeCategoryRepo = appScope === "company" ? repos.companyCategory : repos.personalCategory;
  const activeSpendRepo = appScope === "company" ? repos.companySpend : repos.personalSpend;

  return (
    <AppContext.Provider value={{ 
      categoryRepo: activeCategoryRepo, 
      spendRepo: activeSpendRepo, 
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