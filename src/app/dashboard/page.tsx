"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/presentation/store/AppProvider";
import { DashboardFilters } from "@/domain/use-cases/CalculateMetricsUseCase";
import { DashboardSkeleton } from "@/presentation/components/DashboardSkeleton";
import { ThemeToggle } from "@/presentation/components/ThemeToggle";
import { AddCategoryDialog } from "@/presentation/components/AddCategoryDialog";
import { AddSpendDialog } from "@/presentation/components/AddSpendDialog";
import { DashboardMetrics } from "@/presentation/components/DashboardMetrics";
import { SpendChart } from "@/presentation/components/SpendChart";
import { SpendTrendChart } from "@/presentation/components/SpendTrendChart";
import { CategorySplitChart } from "@/presentation/components/CategorySplitChart";
import { CategoryListCard } from "@/presentation/components/CategoryListCard";
import { ExportPanel } from "@/presentation/components/ExportPanel";
import { DashboardFilter } from "@/presentation/components/DashboardFilter";
import { Button } from "@/components/ui/button";
import { LockScreen } from "@/presentation/components/LockScreen";

export default function DashboardPage() {
  const { isDbReady, isAuthenticated, userRole, logoutUser } = useAppStore();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

  // CRITICAL FIX: Dashboard boots up with the globally synced date parameters
  const [filters, setFilters] = useState<DashboardFilters>(() => {
    let startDate = undefined;
    let endDate = undefined;
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_date_filters");
      if (saved) {
        try {
          const p = JSON.parse(saved);
          if (p.startDate) startDate = new Date(p.startDate);
          if (p.endDate) endDate = new Date(p.endDate);
        } catch (e) {}
      }
    }
    return { categoryId: "ALL", startDate, endDate };
  });

  // Mathematically writes to session storage natively as the charts update
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("financehub_date_filters", JSON.stringify({
        startDate: filters.startDate ? filters.startDate.toISOString() : null,
        endDate: filters.endDate ? filters.endDate.toISOString() : null
      }));
    }
  }, [filters.startDate, filters.endDate]);

  const handleDataRefresh = () => setRefreshTrigger(prev => prev + 1);

  if (!isDbReady) return <DashboardSkeleton />;
  if (!isAuthenticated) return <LockScreen />;

  return (
    <main className="min-h-screen bg-background text-foreground p-8 space-y-6">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FinanceHub</h1>
          <p className="text-sm text-muted-foreground mt-1">Analytics Dashboard</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button variant="secondary" onClick={() => router.push('/')}>
            View Ledger
          </Button>
          <Button variant="secondary" onClick={() => router.push('/budgets')}>Manage Budgets</Button>
          
          <div className="flex items-center space-x-2">
            <ExportPanel />
          </div>
          
          <div className="flex items-center space-x-2 border-l pl-4 ml-2">
            <AddSpendDialog onSpendAdded={handleDataRefresh} />
            {userRole === "admin" && <AddCategoryDialog onCategoryAdded={handleDataRefresh} />}
            <ThemeToggle />
            <Button variant="ghost" className="text-destructive h-9 px-3" onClick={logoutUser}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div id="dashboard-report-area" className="space-y-6 bg-background p-4 rounded-lg">
        <div className="space-y-4">
          <div className="flex justify-end">
            {userRole === "admin" && <DashboardFilter onApply={setFilters} />}
          </div>
          <DashboardMetrics refreshTrigger={refreshTrigger} filters={filters} />
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2"><SpendChart refreshTrigger={refreshTrigger} filters={filters} /></div>
          <div className="md:col-span-1"><CategorySplitChart refreshTrigger={refreshTrigger} filters={filters} /></div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2"><SpendTrendChart refreshTrigger={refreshTrigger} filters={filters} /></div>
          <div className="md:col-span-1"><CategoryListCard refreshTrigger={refreshTrigger} filters={filters} /></div>
        </div>
      </div>
    </main>
  );
}