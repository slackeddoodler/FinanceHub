"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
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
  
  const [supabase] = useState(() => createClient());
  
  // Sequence lock to prevent overlapping async auth events from overwriting state
  const initLock = useRef(0);
  
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
    const fetchRoleAndInit = async (session: Session | null, sequenceId: number) => {
      const userId = session?.user?.id || null;
      
      let role: "admin" | "editor" | "viewer" | "revoked" = "viewer";
      let isOwner = false;

      if (userId) {
        const { data, error } = await supabase
          .from('company_roles')
          .select('role, is_primary_owner')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (data && !error) {
          role = data.role as any;
          isOwner = data.is_primary_owner;
        }
      }
      
      // CRITICAL FIX: If a newer auth event fired while we were awaiting the DB, 
      // discard this stale result to prevent overwriting the correct state.
      if (initLock.current !== sequenceId) return;
      
      // CRITICAL FIX: Batch state updates. 
      // Repositories MUST be updated at the exact same time as isAuthenticated
      // to guarantee the UI never renders a protected route with a null-userId repository.
      setRepos({
        companyCategory: new SupabaseCategoryRepository(false),
        companySpend: new SupabaseSpendRepository(false),
        personalCategory: new SupabaseCategoryRepository(true, userId),
        personalSpend: new SupabaseSpendRepository(true, userId)
      });
      
      setUserRole(role);
      setIsPrimaryOwner(isOwner);
      setIsAuthenticated(!!session);
      setIsDbReady(true);
    };

    // Track the current sequence to handle the initial session
    const initialSequenceId = ++initLock.current;
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => fetchRoleAndInit(data.session, initialSequenceId));

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // Track the current sequence to handle subsequent login/logout events
      const nextSequenceId = ++initLock.current;
      fetchRoleAndInit(session, nextSequenceId);
    });

    return () => {
      initLock.current++; // Invalidate any pending async operations on unmount
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