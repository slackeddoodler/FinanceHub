"use client";

// CRITICAL FIX: Aliased the Supabase User type to prevent collision with the Lucide React User icon
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/presentation/store/AppProvider";
import { createClient } from "@/utils/supabase/client";
import { GlobalHeader } from "@/presentation/components/GlobalHeader";
import { DashboardSkeleton } from "@/presentation/components/DashboardSkeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, User, Edit3, ChevronDown, Check, Trash2, UserMinus, ArrowRightLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  user_id: string;
  role: string;
  is_primary_owner: boolean;
  joined_at: string;
  profiles: { email: string };
}

export default function TeamManagementPage() {
  const router = useRouter();
  const { isDbReady, isAuthenticated, userRole, isPrimaryOwner } = useAppStore();

  const [supabase] = useState(() => createClient());
  
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [userToDelete, setUserToDelete] = useState<TeamMember | null>(null);
  const [userToTransfer, setUserToTransfer] = useState<TeamMember | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isDbReady && userRole !== "admin") {
      router.push("/");
      return;
    }
    if (isDbReady && isAuthenticated) {
      // CRITICAL FIX: Utilize the aliased SupabaseUser type here
      supabase.auth.getUser().then((response: { data: { user: SupabaseUser | null } }) => setCurrentUserId(response.data.user?.id || null));
      fetchTeam();
    }
  }, [isDbReady, isAuthenticated, userRole]);

  const fetchTeam = async () => {
    const { data } = await supabase
      .from("company_roles")
      .select(`user_id, role, is_primary_owner, joined_at, profiles(email)`)
      .order("joined_at", { ascending: true });
    
    if (data) {
      const typedData = data as unknown as TeamMember[];
      
      const sortedData = typedData.sort((a: TeamMember, b: TeamMember) => {
        if (a.is_primary_owner && !b.is_primary_owner) return -1;
        if (!a.is_primary_owner && b.is_primary_owner) return 1;
        return 0; 
      });
      setTeam(sortedData);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setTeam(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
    await supabase.from("company_roles").update({ role: newRole }).eq("user_id", userId);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsProcessing(true);
    try {
      await supabase.rpc('delete_user_account', { target_user_id: userToDelete.user_id });
      setTeam(prev => prev.filter(m => m.user_id !== userToDelete.user_id));
    } catch (err) {
      console.error("Failed to delete user", err);
    } finally {
      setIsProcessing(false);
      setUserToDelete(null);
    }
  };

  const handleTransferOwnership = async () => {
    if (!userToTransfer) return;
    setIsProcessing(true);
    try {
      await supabase.rpc('transfer_ownership', { new_owner_id: userToTransfer.user_id });
      window.location.reload(); 
    } catch (err) {
      console.error("Failed to transfer ownership", err);
      setIsProcessing(false);
      setUserToTransfer(null);
    }
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
                <TableHead className="px-6 w-[220px] text-center">Access Level</TableHead>
                <TableHead className="px-6 w-[150px] text-center">Joined</TableHead>
                <TableHead className="px-6 w-[200px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <TableRow key={member.user_id} className={member.role === 'revoked' ? "opacity-60 bg-muted/30" : ""}>
                  <TableCell className="px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md border border-muted-foreground/20 bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                        {getInitials(member.profiles?.email || "U")}
                      </div>
                      <span className="font-medium text-sm text-foreground">{member.profiles?.email}</span>
                    </div>
                  </TableCell>

                  <TableCell className="px-6">
                    <div className="flex justify-center">
                      {member.is_primary_owner ? (
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium text-sm px-3 h-9">
                          <ShieldCheck className="h-4 w-4" /> Primary Owner
                        </div>
                      ) : member.role === 'revoked' ? (
                        <div className="flex items-center gap-2 text-destructive font-medium text-sm px-3 h-9">
                          <UserMinus className="h-4 w-4" /> Access Revoked
                        </div>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[180px] justify-between font-normal px-3 h-9 shrink-0">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {member.role === "admin" && <ShieldAlert className="h-4 w-4 shrink-0 text-indigo-600" />}
                                {member.role === "editor" && <Edit3 className="h-4 w-4 shrink-0 text-emerald-600" />}
                                {member.role === "viewer" && <User className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                <span className="truncate text-sm text-left capitalize">{member.role}</span>
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
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-6 text-sm text-muted-foreground text-center">
                    {formatDate(member.joined_at)}
                  </TableCell>

                  <TableCell className="px-6 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {member.user_id !== currentUserId && (
                        <>
                          {isPrimaryOwner && member.role === 'admin' && (
                            <Button variant="ghost" size="sm" onClick={() => setUserToTransfer(member)} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 px-2">
                              <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer
                            </Button>
                          )}
                          
                          {!member.is_primary_owner && member.role !== 'revoked' && (
                            <Button variant="ghost" size="sm" onClick={() => handleRoleChange(member.user_id, 'revoked')} className="text-amber-600 hover:text-amber-600 hover:bg-amber-50 px-2">
                              <UserMinus className="h-4 w-4 mr-1.5" /> Revoke
                            </Button>
                          )}

                          {!member.is_primary_owner && member.role === 'revoked' && (
                            <Button variant="ghost" size="sm" onClick={() => handleRoleChange(member.user_id, 'viewer')} className="text-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 px-2">
                              <User className="h-4 w-4 mr-1.5" /> Restore
                            </Button>
                          )}

                          {!member.is_primary_owner && (
                            <Button variant="ghost" size="sm" onClick={() => setUserToDelete(member)} className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!userToDelete} onOpenChange={(o) => !o && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5"/> Delete User Account</DialogTitle>
            <DialogDescription className="pt-2 text-base">
              Are you sure you want to completely erase <b>{userToDelete?.profiles?.email}</b>? This action is irreversible. They will be logged out immediately and their personal data will be wiped from the system.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={isProcessing}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isProcessing}>
              {isProcessing ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToTransfer} onOpenChange={(o) => !o && setUserToTransfer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-indigo-600 flex items-center gap-2"><ArrowRightLeft className="h-5 w-5"/> Transfer Ownership</DialogTitle>
            <DialogDescription className="pt-2 text-base">
              You are assigning Primary Owner rights to <b>{userToTransfer?.profiles?.email}</b>. You will be demoted to a standard Admin and lose the ability to manage other Owners. Do you wish to proceed?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setUserToTransfer(null)} disabled={isProcessing}>Cancel</Button>
            <Button onClick={handleTransferOwnership} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isProcessing ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}