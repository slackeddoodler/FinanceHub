"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

export function LockScreen() {
  const { authRepo, loginUser } = useAppStore();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!authRepo || !username || !password) return;

    try {
      if (isLoginMode) {
        // Login Flow
        const isValid = await authRepo.verifyUser(username, password);
        if (isValid) {
          await loginUser(username);
        } else {
          setError("Invalid username or password.");
        }
      } else {
        // Register Flow
        const exists = await authRepo.userExists(username);
        if (exists) {
          setError("Username already taken.");
          return;
        }
        await authRepo.registerUser(username, password);
        await loginUser(username); // Automatically log them in after creating
      }
    } catch (err) {
      setError("An error occurred during authentication.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-secondary rounded-full">
              <Lock className="w-6 h-6 text-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">FinanceHub Vault</CardTitle>
          <CardDescription>
            {isLoginMode ? "Log in to your isolated database." : "Register a new secure local database."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="text" 
                placeholder="Username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}
            <Button type="submit" className="w-full">
              {isLoginMode ? "Log In" : "Create Account & Enter"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button 
              type="button" 
              className="text-sm text-muted-foreground hover:underline"
              onClick={() => { setIsLoginMode(!isLoginMode); setError(""); }}
            >
              {isLoginMode ? "Need an account? Register here." : "Already have an account? Log in."}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}