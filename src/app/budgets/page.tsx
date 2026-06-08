"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/presentation/store/AppProvider";
import { Category } from "@/domain/entities/Category";
import { SpendItem } from "@/domain/entities/SpendItem";
import { UpdateCategoryBudgetUseCase } from "@/domain/use-cases/UpdateCategoryBudgetUseCase";
import { formatINR } from "@/presentation/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardSkeleton } from "@/presentation/components/DashboardSkeleton";
import { LockScreen } from "@/presentation/components/LockScreen";
import { ThemeToggle } from "@/presentation/components/ThemeToggle";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";

export default function BudgetsPage() {
  const router = useRouter();
  const { isDbReady, isAuthenticated, spendRepo, categoryRepo, logoutUser } = useAppStore();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSpends, setAllSpends] = useState<SpendItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Track temporary user inputs per category ID
  const [draftBudgets, setDraftBudgets] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleDataRefresh = () => {
    setDraftBudgets({});
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!isDbReady || !isAuthenticated || !spendRepo || !categoryRepo) return;
    categoryRepo.findAll().then(setCategories);
    spendRepo.findByDateRange(new Date("2000-01-01"), new Date("2100-01-01")).then(setAllSpends);
  }, [isDbReady, isAuthenticated, spendRepo, categoryRepo, refreshTrigger]);

  const budgetMatrix = useMemo(() => {
    return categories.map(cat => {
      const catSpends = allSpends.filter(s => s.categoryId === cat.id);
      const totalSpent = catSpends.reduce((sum, item) => sum + item.totalAmount, 0);
      const remaining = cat.allocatedBudget - totalSpent;
      const utilization = cat.allocatedBudget > 0 ? Math.min((totalSpent / cat.allocatedBudget) * 100, 100) : (totalSpent > 0 ? 100 : 0);
      
      const isDrafted = draftBudgets[cat.id] !== undefined;
      const draftValue = isDrafted ? Number(draftBudgets[cat.id]) : cat.allocatedBudget;
      const hasChanged = isDrafted && !isNaN(draftValue) && draftValue !== cat.allocatedBudget;

      return {
        ...cat,
        totalSpent,
        remaining,
        utilization,
        draftInput: isDrafted ? draftBudgets[cat.id] : cat.allocatedBudget.toString(),
        hasChanged,
        draftValue
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, allSpends, draftBudgets]);

  const changedCount = budgetMatrix.filter(c => c.hasChanged).length;

  const handleSaveSingle = async (categoryId: string, newBudget: number) => {
    if (!categoryRepo) return;
    setIsSaving(true);
    try {
      const useCase = new UpdateCategoryBudgetUseCase(categoryRepo);
      await useCase.execute(categoryId, newBudget);
      handleDataRefresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!categoryRepo) return;
    setIsSaving(true);
    try {
      const useCase = new UpdateCategoryBudgetUseCase(categoryRepo);
      const promises = budgetMatrix
        .filter(c => c.hasChanged)
        .map(c => useCase.execute(c.id, c.draftValue));
      await Promise.all(promises);
      handleDataRefresh();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isDbReady) return <DashboardSkeleton />;
  if (!isAuthenticated) return <LockScreen />;

  return (
    <main className="min-h-screen bg-background text-foreground p-8 space-y-6 pb-24">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Allocation</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and rebalance your category limits.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => router.push('/')}>View Ledger</Button>
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>View Dashboard</Button>
          <div className="flex items-center space-x-2 border-l pl-4 ml-2">
            <ThemeToggle />
            <Button variant="ghost" className="text-destructive h-9 px-3" onClick={logoutUser}>Logout</Button>
          </div>
        </div>
      </header>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle>Portfolio Rebalancing</CardTitle>
          <CardDescription>Review your total historical spending to adjust future allocations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="w-[200px] px-4">Category Name</TableHead>
                <TableHead className="text-right px-4">Current Budget</TableHead>
                <TableHead className="text-right px-4">Total Spent</TableHead>
                <TableHead className="text-right px-4">Remaining / Deficit</TableHead>
                <TableHead className="w-[150px] px-4">Utilization</TableHead>
                <TableHead className="text-right w-[120px] px-4">New Budget (₹)</TableHead>
                <TableHead className="w-[100px] text-center px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgetMatrix.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No categories available.</TableCell></TableRow>
              ) : (
                budgetMatrix.map((cat) => (
                  <TableRow key={cat.id} className={cat.hasChanged ? "bg-primary/5 hover:bg-primary/10 transition-colors" : ""}>
                    <TableCell className="font-medium px-4">{cat.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground px-4">{formatINR(cat.allocatedBudget)}</TableCell>
                    <TableCell className="text-right font-medium px-4">{formatINR(cat.totalSpent)}</TableCell>
                    <TableCell className={`text-right font-semibold px-4 ${cat.remaining < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {cat.remaining < 0 ? `-${formatINR(Math.abs(cat.remaining))}` : formatINR(cat.remaining)}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                          <span>{cat.utilization.toFixed(0)}%</span>
                          {cat.remaining < 0 && <AlertCircle className="h-3 w-3 text-destructive" />}
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${cat.utilization >= 100 ? 'bg-destructive' : cat.utilization >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${cat.utilization}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <Input 
                        type="number" 
                        value={cat.draftInput} 
                        onChange={(e) => setDraftBudgets(prev => ({ ...prev, [cat.id]: e.target.value }))}
                        className={`h-9 w-24 text-right font-medium ${cat.hasChanged ? "border-primary ring-1 ring-primary/20" : ""}`}
                      />
                    </TableCell>
                    <TableCell className="px-4 text-center">
                      {/* CRITICAL UX: Inline Save. Only visible if THIS row changed, and disabled if bulk mode (2+ changes) is triggered to force user to use the bulk button */}
                      {cat.hasChanged && changedCount === 1 && (
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveSingle(cat.id, cat.draftValue)}
                          disabled={isSaving}
                          className="h-8 w-full animate-in fade-in zoom-in-95 duration-200"
                        >
                          <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                        </Button>
                      )}
                      {cat.hasChanged && changedCount > 1 && (
                        <CheckCircle2 className="h-5 w-5 mx-auto text-primary animate-in fade-in zoom-in-95" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CRITICAL UX: Floating Bulk Save Action Bar. Only appears when 2 or more rows have unsaved changes */}
      {changedCount >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <Card className="shadow-xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <CardContent className="flex items-center gap-6 py-3 px-6">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-primary">Unsaved Changes Detected</span>
                <span className="text-xs text-muted-foreground">You are rebalancing {changedCount} categories.</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDraftBudgets({})} disabled={isSaving}>Discard</Button>
                <Button size="sm" onClick={handleSaveAll} disabled={isSaving} className="bg-primary text-primary-foreground shadow-md hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" /> Save All Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}