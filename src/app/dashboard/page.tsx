"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/presentation/store/AppProvider";
import { DashboardFilters } from "@/domain/use-cases/CalculateMetricsUseCase";
import { DashboardSkeleton } from "@/presentation/components/DashboardSkeleton";
import { DashboardMetrics } from "@/presentation/components/DashboardMetrics";
import { SpendChart } from "@/presentation/components/SpendChart";
import { SpendTrendChart } from "@/presentation/components/SpendTrendChart";
import { CategorySplitChart } from "@/presentation/components/CategorySplitChart";
import { CategoryListCard } from "@/presentation/components/CategoryListCard";
import { DashboardFilter } from "@/presentation/components/DashboardFilter";
import { LockScreen } from "@/presentation/components/LockScreen";
import { GlobalHeader } from "@/presentation/components/GlobalHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const pathname = usePathname();
  const { isDbReady, isAuthenticated, userRole } = useAppStore();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isPersonal = pathname?.startsWith("/personal");

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

  // CRITICAL FIX: The physical suspension block for revoked corporate accounts
  if (userRole === "revoked" && !isPersonal) {
    return (
      <main className="min-h-screen bg-background p-8 flex flex-col">
        <GlobalHeader title="Company Workspace" subtitle="Access Suspended" activePage="dashboard" handleDataRefresh={() => {}} />
        <div className="flex-1 flex items-center justify-center w-full mt-12">
          <Card className="max-w-md w-full shadow-lg border-destructive/20">
             <CardHeader className="text-center pb-2">
               <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
               <CardTitle className="text-xl">Access Revoked</CardTitle>
               <CardDescription>Your access to the company workspace has been suspended by an administrator.</CardDescription>
             </CardHeader>
             <CardContent className="text-center flex flex-col gap-4">
               <p className="text-sm text-muted-foreground">You can still securely access your personal dashboard and transactions.</p>
               <Button onClick={() => window.location.href = '/personal/dashboard'} className="w-full">Go to Personal Workspace</Button>
             </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-8 space-y-6">
      <GlobalHeader title="Company Analytics" subtitle="Shared financial insights." activePage="dashboard" handleDataRefresh={handleDataRefresh} />

      <div id="dashboard-report-area" className="space-y-6 bg-background p-4 rounded-lg">
        <div className="space-y-4">
          <div className="flex justify-end"><DashboardFilter onApply={setFilters} /></div>
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