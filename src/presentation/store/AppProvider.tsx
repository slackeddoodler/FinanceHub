"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ICategoryRepository, ISpendRepository } from "@/domain/interfaces/repositories";
import { SupabaseCategoryRepository } from "@/data/repositories/SupabaseCategoryRepository";
import { SupabaseSpendRepository } from "@/data/repositories/SupabaseSpendRepository";
import { createClient } from "@/utils/supabase/client";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";

interface AppContextType {
  categoryRepo: ICategoryRepository | null;
  spendRepo: ISpendRepository | null;
  isDbReady: boolean;
  isAuthenticated: boolean;
  logoutUser: () => Promise<void>;
  userRole: "admin" | "editor" | "viewer" | "revoked";
  isPrimaryOwner: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // CRITICAL FIX 1: Lazy-initialize the client to prevent the infinite render loop and SSL crash
  const [supabase] = useState(() => createClient());
  
  const [isDbReady, setIsDbReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [userRole, setUserRole] = useState<"admin" | "editor" | "viewer" | "revoked">("viewer");
  const [isPrimaryOwner, setIsPrimaryOwner] = useState(false);

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
    const fetchRoleAndInit = async (session: Session | null) => {
      const userId = session?.user?.id || null;
      setIsAuthenticated(!!session);
      
      if (userId) {
        const { data, error } = await supabase
          .from('company_roles')
          .select('role, is_primary_owner')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (data && !error) {
          setUserRole(data.role as "admin" | "editor" | "viewer" | "revoked");
          setIsPrimaryOwner(data.is_primary_owner);
        } else {
          setUserRole("viewer");
          setIsPrimaryOwner(false);
        }
      } else {
        setUserRole("viewer");
        setIsPrimaryOwner(false);
      }
      
      // CRITICAL FIX 2: Restored `userId` to correctly bypass the internal repository fail-safe
      setRepos({
        companyCategory: new SupabaseCategoryRepository(false),
        companySpend: new SupabaseSpendRepository(false),
        personalCategory: new SupabaseCategoryRepository(true, userId),
        personalSpend: new SupabaseSpendRepository(true, userId)
      });
      
      setIsDbReady(true);
    };

    supabase.auth.getSession().then((response: { data: { session: Session | null } }) => fetchRoleAndInit(response.data.session));

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      fetchRoleAndInit(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase]); // Safe to use in dependency array now because `supabase` is memoized by useState

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
      userRole,
      isPrimaryOwner
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