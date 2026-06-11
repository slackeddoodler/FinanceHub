"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Mail, KeyRound, Loader2, ArrowRight, ShieldCheck, Key } from "lucide-react";

type AuthView = "LOGIN" | "SIGNUP" | "FORGOT_PASSWORD";
type AuthStep = "INITIAL" | "VERIFY";

export function LockScreen() {
  const supabase = createClient();
  
  // State Management
  const [view, setView] = useState<AuthView>("LOGIN");
  const [step, setStep] = useState<AuthStep>("INITIAL");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // For returning users logging in
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState(""); // For new users or resets

  const switchView = (newView: AuthView) => {
    setView(newView);
    setStep("INITIAL");
    setError(null);
    setPassword("");
    setOtp("");
    setNewPassword("");
  };

  // --- 1. LOGIN FLOW ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // AppProvider's onAuthStateChange will automatically route the user
    } catch (err: any) {
      setError(err.message || "Invalid login credentials.");
      setIsLoading(false);
    }
  };

  // --- 2. INITIALIZE SIGNUP OR RECOVERY (SENDS OTP) ---
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError(null);

    try {
      if (view === "SIGNUP") {
        const { error } = await supabase.auth.signInWithOtp({ 
          email, 
          options: { shouldCreateUser: true } 
        });
        if (error) throw error;
      } else if (view === "FORGOT_PASSWORD") {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
      }
      setStep("VERIFY");
    } catch (err: any) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. VERIFY OTP AND SET PASSWORD (CHAINED EXECUTION) ---
  const handleVerifyAndSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp || !newPassword) return;
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Step A: Verify the code to establish the secure session
      const authType = view === "FORGOT_PASSWORD" ? "recovery" : "email";
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: authType,
      });

      if (verifyError) throw verifyError;

      // Step B: Immediately update the user with their newly chosen password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;
      
    } catch (err: any) {
      setError(err.message || "Invalid verification code or password update failed.");
      setIsLoading(false);
    }
  };

  // --- 4. MICROSOFT OAUTH ---
  const handleMicrosoftLogin = async () => {
  setIsLoading(true);
  setError(null);
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { 
        scopes: 'email', 
        redirectTo: `${window.location.origin}/`,
        // CRITICAL FIX: Forces Microsoft to always show the account picker
        queryParams: {
          prompt: 'select_account',
        }
      }
    });
    if (error) throw error;
  } catch (err: any) {
    setError(err.message || "Microsoft authentication failed.");
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-muted/50 overflow-hidden">
        <CardHeader className="space-y-3 pb-6 text-center bg-background">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">FinanceHub</CardTitle>
          <CardDescription>
            {view === "LOGIN" && "Secure enterprise ledger & analytics."}
            {view === "SIGNUP" && step === "INITIAL" && "Create your secure account."}
            {view === "FORGOT_PASSWORD" && step === "INITIAL" && "Reset your password securely."}
            {step === "VERIFY" && "Enter the verification code sent to your inbox."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2 animate-in fade-in zoom-in-95">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* === LOGIN VIEW === */}
          {view === "LOGIN" && (
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase text-muted-foreground">Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="name@company.com" className="pl-9 h-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase text-muted-foreground">Password</Label>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary/80 hover:text-primary" onClick={() => switchView("FORGOT_PASSWORD")} type="button">Forgot Password?</Button>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" className="pl-9 h-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </div>
              </div>
              
              <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading || !email || !password}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>

              <div className="text-center pt-2">
                <span className="text-sm text-muted-foreground">Don't have an account? </span>
                <Button variant="link" className="p-0 h-auto text-sm font-semibold" onClick={() => switchView("SIGNUP")} type="button">Create one</Button>
              </div>
            </form>
          )}

          {/* === INITIAL SIGNUP OR FORGOT PASSWORD VIEW === */}
          {(view === "SIGNUP" || view === "FORGOT_PASSWORD") && step === "INITIAL" && (
            <form onSubmit={handleSendOTP} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase text-muted-foreground">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="name@company.com" className="pl-9 h-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading || !email}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Verification Code"}
              </Button>
              
              <div className="text-center pt-2">
                <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground" onClick={() => switchView("LOGIN")} type="button">
                  &larr; Back to Login
                </Button>
              </div>
            </form>
          )}

          {/* === VERIFY & SET PASSWORD VIEW === */}
          {(view === "SIGNUP" || view === "FORGOT_PASSWORD") && step === "VERIFY" && (
            <form onSubmit={handleVerifyAndSetPassword} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="otp" className="text-xs font-semibold uppercase text-muted-foreground">Verification Code</Label>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setStep("INITIAL")} type="button">Change Email</Button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="otp" type="text" placeholder="Enter 8-digit code" className="pl-9 h-10 font-mono tracking-widest text-center" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={8} autoFocus />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label htmlFor="newPassword" className="text-xs font-semibold uppercase text-muted-foreground">Create New Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="newPassword" type="password" placeholder="At least 6 characters" className="pl-9 h-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                </div>
              </div>

              <Button type="submit" className="w-full h-10 font-medium mt-4" disabled={isLoading || otp.length < 6 || newPassword.length < 6}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Save Password"} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
          )}

          {/* === MICROSOFT OPT-IN (Only visible on initial screens) === */}
          {step === "INITIAL" && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with</span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full h-10 font-medium border-muted-foreground/25 hover:bg-muted/50" onClick={handleMicrosoftLogin} disabled={isLoading}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Continue with Microsoft
              </Button>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}