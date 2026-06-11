"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/presentation/store/AppProvider";
import { createClient } from "@/utils/supabase/client";
import { GlobalHeader } from "@/presentation/components/GlobalHeader";
import { DashboardSkeleton } from "@/presentation/components/DashboardSkeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ShieldAlert, User, Edit3, ChevronDown, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  user_id: string;
  role: string;
  joined_at: string;
  profiles: { email: string };
}

export default function TeamManagementPage() {
  const router = useRouter();
  const { isDbReady, isAuthenticated, userRole } = useAppStore();
  const supabase = createClient();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isDbReady && userRole !== "admin") {
      router.push("/");
      return;
    }
    if (isDbReady && isAuthenticated) {
      supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
      fetchTeam();
    }
  }, [isDbReady, isAuthenticated, userRole]);

  const fetchTeam = async () => {
    const { data } = await supabase
      .from("company_roles")
      .select(`user_id, role, joined_at, profiles(email)`)
      .order("joined_at", { ascending: true })
      .returns<TeamMember[]>();
    
    if (data) setTeam(data);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setTeam(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
    await supabase.from("company_roles").update({ role: newRole }).eq("user_id", userId);
  };

  const handleRemoveAccess = async (userId: string) => {
    if (userId === currentUserId) return; // Prevent self-deletion
    setTeam(prev => prev.filter(m => m.user_id !== userId));
    await supabase.from("company_roles").delete().eq("user_id", userId);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Just now";
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString));
  };

  const getInitials = (email: string) => email.substring(0, 2).toUpperCase();

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
                <TableHead className="px-6 py-4">User</TableHead>
                <TableHead className="px-6 w-[220px]">Role</TableHead>
                <TableHead className="px-6 w-[150px]">Joined</TableHead>
                <TableHead className="px-6 w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <TableRow key={member.user_id}>
                  {/* Column 1: User (Avatar, Name/Email) */}
                  <TableCell className="px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md border border-muted-foreground/20 bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                        {getInitials(member.profiles?.email || "U")}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-foreground">{member.profiles?.email}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Column 2: Modern Role Dropdown */}
                  <TableCell className="px-6">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[180px] justify-between font-normal px-3 h-9 shrink-0">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {member.role === "admin" && <ShieldAlert className="h-4 w-4 shrink-0 text-indigo-600" />}
                            {member.role === "editor" && <Edit3 className="h-4 w-4 shrink-0 text-emerald-600" />}
                            {member.role === "viewer" && <User className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            <span className="truncate text-sm text-left capitalize">
                              {member.role}
                            </span>
                          </div>
                          <ChevronDown className="h-3 w-3 opacity-50 ml-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-1 shadow-lg" style={{ width: 'var(--radix-popover-trigger-width)' }} align="start">
                        <div className="flex flex-col gap-0.5">
                          {["viewer", "editor", "admin"].map((r) => (
                            <div
                              key={r}
                              onClick={() => handleRoleChange(member.user_id, r)}
                              className={cn(
                                "flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer transition-colors hover:bg-muted",
                                member.role === r && "bg-primary/10 text-primary font-medium hover:bg-primary/10"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 capitalize">
                                {r === "admin" && <ShieldAlert className="h-4 w-4 shrink-0 opacity-70" />}
                                {r === "editor" && <Edit3 className="h-4 w-4 shrink-0 opacity-70" />}
                                {r === "viewer" && <User className="h-4 w-4 shrink-0 opacity-70" />}
                                <span className="truncate">{r}</span>
                              </div>
                              {member.role === r && <Check className="h-4 w-4 shrink-0 ml-2" />}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>

                  {/* Column 3: Joined Date */}
                  <TableCell className="px-6 text-sm text-muted-foreground">
                    {formatDate(member.joined_at)}
                  </TableCell>

                  {/* Column 4: Subtle Actions */}
                  <TableCell className="px-6 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2 font-normal"
                      disabled={member.user_id === currentUserId}
                      onClick={() => handleRemoveAccess(member.user_id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" /> Remove
                    </Button>
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