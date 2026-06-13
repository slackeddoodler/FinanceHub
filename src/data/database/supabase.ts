import { createClient } from "@/utils/supabase/client";

// Proxies all repository database calls to the SSR singleton.
// This completely eliminates the dual-SDK GoTrue collision while requiring 
// ZERO refactoring to your existing repositories.
export const supabase = new Proxy({} as any, {
  get: (_, prop) => {
    const client = createClient();
    const targetProp = client[prop as keyof typeof client];
    
    // Bind functions securely to retain the correct 'this' execution context
    if (typeof targetProp === 'function') {
      return targetProp.bind(client);
    }
    return targetProp;
  }
});