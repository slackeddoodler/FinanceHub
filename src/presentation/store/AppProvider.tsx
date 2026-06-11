"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ICategoryRepository, ISpendRepository } from "@/domain/interfaces/repositories";
import { SupabaseCategoryRepository } from "@/data/repositories/SupabaseCategoryRepository";
import { SupabaseSpendRepository } from "@/data/repositories/SupabaseSpendRepository";
import { createClient } from "@/utils/supabase/client";

interface AppContextType {
  categoryRepo: ICategoryRepository | null;
  spendRepo: ISpendRepository | null;
  isDbReady: boolean;
  isAuthenticated: boolean;
  logoutUser: () => Promise<void>;
  userRole: "admin" | "editor" | "viewer";
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [isDbReady, setIsDbReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "editor" | "viewer">("viewer");

  const [repos, setRepos] = useState<{
    companyCategory: ICategoryRepository | null,
    companySpend: ISpendRepository | null,
    personalCategory: ICategoryRepository | null,
    personalSpend: ISpendRepository | null,
  }>({
    companyCategory: null, companySpend: null, personalCategory: null, personalSpend: null
  });

  const appScope = pathname?.startsWith('/personal') ? "personal" : "company";

  useEffect(() => {
    const fetchRoleAndInit = async (session: any) => {
      const userId = session?.user?.id || null;
      setIsAuthenticated(!!session);
      
      if (userId) {
        // Use maybeSingle() to safely handle users who might not have a role yet (prevents 406 errors)
        const { data, error } = await supabase
          .from('company_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (data && !error) {
          setUserRole(data.role as "admin" | "editor" | "viewer");
        } else {
          setUserRole("viewer"); // Default fallback
        }
      } else {
        setUserRole("viewer");
      }
      
      setRepos({
        companyCategory: new SupabaseCategoryRepository(false),
        companySpend: new SupabaseSpendRepository(false),
        personalCategory: new SupabaseCategoryRepository(true, userId),
        personalSpend: new SupabaseSpendRepository(true, userId)
      });
      
      setIsDbReady(true);
    };

    // 1. Initial Check on Mount
    supabase.auth.getSession().then(({ data: { session } }) => fetchRoleAndInit(session));

    // 2. Real-time Listener (Catches logins, logouts, and OTP verifications)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      fetchRoleAndInit(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const logoutUser = async () => {
    await supabase.auth.signOut();
    router.push("/");
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