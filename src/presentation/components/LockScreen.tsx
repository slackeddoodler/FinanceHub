// "use client";

// import { useState } from "react";
// import { useAppStore } from "../store/AppProvider";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Lock } from "lucide-react";

// export function LockScreen() {
//   const [password, setPassword] = useState("");
//   // CRITICAL FIX: Removed obsolete 'authRepo' destructuring
//   const { loginUser } = useAppStore();

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     // CRITICAL FIX: Bypassing the obsolete local password verification.
//     // We instantly log the user in to preserve UI access for the data migration.
//     // This entire component will be replaced by Microsoft SSO in the next phase.
//     await loginUser("admin");
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-background p-4">
//       <Card className="w-full max-w-sm shadow-lg border-muted">
//         <CardHeader className="text-center space-y-2">
//           <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
//             <Lock className="h-6 w-6 text-primary" />
//           </div>
//           <CardTitle className="text-2xl font-bold tracking-tight">FinanceHub</CardTitle>
//           <CardDescription>
//             Local authentication is deprecated. Click unlock to proceed.
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleLogin} className="space-y-4">
//             <Input 
//               type="password" 
//               placeholder="Enter any password..." 
//               value={password} 
//               onChange={(e) => setPassword(e.target.value)} 
//               className="h-10"
//             />
//             <Button type="submit" className="w-full h-10 font-medium">
//               Unlock Ledger
//             </Button>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export function LockScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm p-8 space-y-6 bg-card border rounded-xl shadow-lg text-center animate-in zoom-in-95 duration-200">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">FinanceHub Secured</h1>
          <p className="text-sm text-muted-foreground">
            Corporate identity verification is required to access this ledger.
          </p>
        </div>
        
        {/* CRITICAL FIX: Triggers the Microsoft Entra ID OAuth flow */}
        <Button 
          size="lg"
          className="w-full font-medium" 
          onClick={() => signIn("microsoft-entra-id")}
        >
          Sign in with Microsoft
        </Button>
      </div>
    </div>
  );
}