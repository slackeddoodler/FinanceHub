"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/presentation/store/AppProvider";
import { createClient } from "@/utils/supabase/client";
import { GlobalHeader } from "@/presentation/components/GlobalHeader";
import { DashboardSkeleton } from "@/presentation/components/DashboardSkeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, User, Edit3 } from "lucide-react";

interface TeamMember {
  user_id: string;
  role: string;
  profiles: { email: string };
}

export default function TeamManagementPage() {
  const router = useRouter();
  const { isDbReady, isAuthenticated, userRole } = useAppStore();
  const supabase = createClient();
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    // Security Kick-out: If not an admin, boot them back to the ledger.
    if (isDbReady && userRole !== "admin") {
      router.push("/");
      return;
    }

    if (isDbReady && isAuthenticated) fetchTeam();
  }, [isDbReady, isAuthenticated, userRole]);

  const fetchTeam = async () => {
    // Perform a SQL JOIN to get the role AND the email from the profiles table
    const { data } = await supabase
      .from("company_roles")
      .select(`user_id, role, profiles(email)`)
      .returns<TeamMember[]>();
    
    if (data) setTeam(data);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // 1. Optimistic UI update
    setTeam(prev => prev.map(member => member.user_id === userId ? { ...member, role: newRole } : member));
    
    // 2. Database update (Enforced securely by RLS!)
    await supabase.from("company_roles").update({ role: newRole }).eq("user_id", userId);
  };

  if (!isDbReady) return <DashboardSkeleton />;

  return (
    <main className="min-h-screen bg-background text-foreground p-8 space-y-6">
      <GlobalHeader title="Team Management" subtitle="Manage company access and permissions." activePage={"team" as any} handleDataRefresh={fetchTeam} />

      <Card className="max-w-4xl shadow-sm border-muted/50">
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle>Directory</CardTitle>
          <CardDescription>All users authenticated in the system.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="px-6 py-4">Employee Email</TableHead>
                <TableHead className="px-6 w-[200px]">Access Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell className="px-6 font-medium">{member.profiles?.email}</TableCell>
                  <TableCell className="px-6">
                    <Select value={member.role} onValueChange={(val) => handleRoleChange(member.user_id, val)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground"/> Viewer (Read-only)</div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2"><Edit3 className="h-3.5 w-3.5 text-emerald-600"/> Editor (Read & Write)</div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2"><ShieldAlert className="h-3.5 w-3.5 text-indigo-600"/> Admin (Full Access)</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}