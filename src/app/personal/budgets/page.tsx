"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
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
import { GlobalHeader } from "@/presentation/components/GlobalHeader";
import { Save, AlertCircle, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortKey = 'allocatedBudget' | 'totalSpent' | 'remaining';

export default function PersonalBudgetsPage() {
  const pathname = usePathname();
  // CRITICAL FIX: Extracted userRole from the store
  const { isDbReady, isAuthenticated, spendRepo, categoryRepo, userRole } = useAppStore();
  
  // --- RBAC PERMISSION CHECK ---
  const isPersonal = pathname?.startsWith("/personal");
  const canEdit = isPersonal || userRole === "admin" || userRole === "editor";
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSpends, setAllSpends] = useState<SpendItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [draftBudgets, setDraftBudgets] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' } | null>(null);

  const handleDataRefresh = () => {
    setDraftBudgets({});
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!isDbReady || !isAuthenticated || !spendRepo || !categoryRepo) return;
    categoryRepo.findAll().then(setCategories);
    spendRepo.findByDateRange(new Date("2000-01-01"), new Date("2100-01-01")).then(setAllSpends);
  }, [isDbReady, isAuthenticated, spendRepo, categoryRepo, refreshTrigger]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      setSortConfig(null);
      return;
    }
    
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 shrink-0" /> : <ArrowDown className="ml-2 h-4 w-4 shrink-0" />;
  };

  const budgetMatrix = useMemo(() => {
    const mapped = categories.map(cat => {
      const catSpends = allSpends.filter(s => s.categoryId === cat.id);
      const totalSpent = catSpends.reduce((sum, item) => sum + item.totalAmount, 0);
      const remaining = cat.allocatedBudget - totalSpent;
      const utilization = cat.allocatedBudget > 0 ? (totalSpent / cat.allocatedBudget) * 100 : (totalSpent > 0 ? 100 : 0);
      
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
    });

    if (sortConfig) {
      return mapped.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return mapped.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, allSpends, draftBudgets, sortConfig]);

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
      
      {/* GLOBAL HEADER IS INJECTED HERE */}
      <GlobalHeader 
        title="Personal Budgets" 
        subtitle="Manage your private allocations." 
        activePage="budgets" 
        handleDataRefresh={handleDataRefresh} 
      />

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle>Portfolio Rebalancing</CardTitle>
          <CardDescription>Review your total historical spending to adjust future allocations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="w-[200px] px-4 align-middle">Category Name</TableHead>
                
                <TableHead className="px-6">
                  <div className="flex items-center justify-end">
                    <Button variant="ghost" size="sm" onClick={() => requestSort('allocatedBudget')} className="-mr-3 h-8 font-medium">
                      Current Budget
                      {renderSortIcon('allocatedBudget')}
                    </Button>
                  </div>
                </TableHead>
                
                <TableHead className="px-6">
                  <div className="flex items-center justify-end">
                    <Button variant="ghost" size="sm" onClick={() => requestSort('totalSpent')} className="-mr-3 h-8 font-medium">
                      Total Spent
                      {renderSortIcon('totalSpent')}
                    </Button>
                  </div>
                </TableHead>
                
                <TableHead className="pl-2 pr-12">
                  <div className="flex items-center justify-end">
                    <Button variant="ghost" size="sm" onClick={() => requestSort('remaining')} className="-mr-3 h-8 font-medium">
                      Remaining / Deficit
                      {renderSortIcon('remaining')}
                    </Button>
                  </div>
                </TableHead>
                
                <TableHead className="w-[150px] px-6 align-middle">Utilization</TableHead>
                
                {/* CRITICAL FIX: Hide the Input and Action headers from Viewers */}
                {canEdit && <TableHead className="text-right w-[120px] px-6 align-middle">New Budget (₹)</TableHead>}
                {canEdit && <TableHead className="w-[100px] text-center px-6 align-middle">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgetMatrix.length === 0 ? (
                <TableRow><TableCell colSpan={canEdit ? 7 : 5} className="text-center py-8 text-muted-foreground">No categories available.</TableCell></TableRow>
              ) : (
                budgetMatrix.map((cat) => (
                  <TableRow key={cat.id} className={cat.hasChanged ? "bg-primary/5 hover:bg-primary/10 transition-colors" : ""}>
                    <TableCell className="font-medium px-4">{cat.name}</TableCell>
                    
                    <TableCell className="text-right text-muted-foreground px-6">{formatINR(cat.allocatedBudget)}</TableCell>
                    <TableCell className="text-right font-medium px-6">{formatINR(cat.totalSpent)}</TableCell>
                    
                    <TableCell className={`text-right font-semibold pl-2 pr-12 ${cat.remaining < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {cat.remaining < 0 ? `-${formatINR(Math.abs(cat.remaining))}` : formatINR(cat.remaining)}
                    </TableCell>
                    
                    <TableCell className="px-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                          <span>{cat.utilization.toFixed(0)}%</span>
                          {cat.remaining < 0 && <AlertCircle className="h-3 w-3 text-destructive" />}
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${cat.utilization >= 100 ? 'bg-destructive' : cat.utilization >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(cat.utilization, 100)}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* CRITICAL FIX: Hide the budget inputs from Viewers */}
                    {canEdit && (
                      <TableCell className="px-6">
                        <Input 
                          type="number" 
                          value={cat.draftInput} 
                          onChange={(e) => setDraftBudgets(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          className={`h-9 w-24 text-right font-medium ${cat.hasChanged ? "border-primary ring-1 ring-primary/20" : ""}`}
                        />
                      </TableCell>
                    )}
                    
                    {/* CRITICAL FIX: Hide the individual save buttons from Viewers */}
                    {canEdit && (
                      <TableCell className="px-6 text-center">
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
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CRITICAL FIX: Only let users with write-access see the global save floating bar */}
      {canEdit && changedCount >= 2 && (
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