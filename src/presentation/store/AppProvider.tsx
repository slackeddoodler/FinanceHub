"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ICategoryRepository, ISpendRepository } from "../../domain/interfaces/repositories";
import { PGliteCategoryRepository } from "../../data/repositories/PGliteCategoryRepository";
import { PGliteSpendRepository } from "../../data/repositories/PGliteSpendRepository";
import { PGliteAuthRepository } from "../../data/repositories/PGliteAuthRepository";
import { setActiveUserDb } from "../../data/database/pglite"; // Import the router

interface AppContextType {
  categoryRepo: ICategoryRepository | null;
  spendRepo: ISpendRepository | null;
  authRepo: PGliteAuthRepository | null;
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
  const [authRepo, setAuthRepo] = useState<PGliteAuthRepository | null>(null);
  
  const [isDbReady, setIsDbReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole] = useState<"admin" | "standard">("admin"); 

  // Boot only the Auth Registry initially
  useEffect(() => {
    const initSystem = async () => {
      try {
        const aRepo = new PGliteAuthRepository();
        await aRepo.init();
        setAuthRepo(aRepo);
        setIsDbReady(true);
      } catch (error) {
        console.error("System Boot Failed:", error);
      }
    };
    initSystem();
  }, []);

  // Fired when the LockScreen verifies a password
  const loginUser = async (username: string) => {
    try {
      // 1. Instruct the router to isolate the specific user's DB
      await setActiveUserDb(username.toLowerCase());
      
      // 2. Instantiate the repos (they will securely query the active DB)
      setCategoryRepo(new PGliteCategoryRepository());
      setSpendRepo(new PGliteSpendRepository());
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Failed to route user database:", error);
    }
  };

  const logoutUser = () => {
    setIsAuthenticated(false);
    setCategoryRepo(null);
    setSpendRepo(null);
  };

  return (
    <AppContext.Provider value={{ 
      categoryRepo, spendRepo, authRepo, 
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