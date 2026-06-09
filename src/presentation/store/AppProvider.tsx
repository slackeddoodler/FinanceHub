"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ICategoryRepository, ISpendRepository } from "../../domain/interfaces/repositories";
// 1. Import the new Supabase Repositories
import { SupabaseCategoryRepository } from "../../data/repositories/SupabaseCategoryRepository";
import { SupabaseSpendRepository } from "../../data/repositories/SupabaseSpendRepository";

interface AppContextType {
  categoryRepo: ICategoryRepository | null;
  spendRepo: ISpendRepository | null;
  isDbReady: boolean;
  isAuthenticated: boolean;
  loginUser: (username: string) => Promise<void>;
  logoutUser: () => void;
  userRole: "admin" | "standard";
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [categoryRepo, setCategoryRepo] = useState<ICategoryRepository | null>(null);
  const [spendRepo, setSpendRepo] = useState<ISpendRepository | null>(null);
  
  const [isDbReady, setIsDbReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole] = useState<"admin" | "standard">("admin"); 

  // 2. Supabase Initialization
  useEffect(() => {
    // Supabase is cloud-hosted and instantly ready. 
    // We instantiate the repositories immediately on mount.
    setCategoryRepo(new SupabaseCategoryRepository());
    setSpendRepo(new SupabaseSpendRepository());
    setIsDbReady(true);
  }, []);

  // 3. Stubbing the Login Function
  // We keep this signature intact so your existing LockScreen.tsx doesn't crash.
  // It simply bypasses the old database routing and grants access to the UI.
  // In the next phase, Auth.js will replace this entirely.
  const loginUser = async (username: string) => {
    setIsAuthenticated(true);
  };

  const logoutUser = () => {
    setIsAuthenticated(false);
  };

  return (
    <AppContext.Provider value={{ 
      categoryRepo, spendRepo, 
      isDbReady, isAuthenticated, loginUser, logoutUser, userRole 
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