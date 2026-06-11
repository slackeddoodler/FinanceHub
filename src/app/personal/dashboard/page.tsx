"use client";

import { useState, useEffect } from "react";
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

export default function PersonalDashboardPage() {
  const { isDbReady, isAuthenticated } = useAppStore();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // CRITICAL FIX: Isolate Storage Keys to Personal Workspace
  const [filters, setFilters] = useState<DashboardFilters>(() => {
    let startDate = undefined;
    let endDate = undefined;
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_personal_date_filters");
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
      sessionStorage.setItem("financehub_personal_date_filters", JSON.stringify({
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
      
      {/* GLOBAL HEADER IS INJECTED HERE */}
      <GlobalHeader 
        title="Personal Analytics" 
        subtitle="Insights securely scoped to your account." 
        activePage="dashboard" 
        handleDataRefresh={handleDataRefresh} 
      />

      <div id="dashboard-report-area" className="space-y-6 bg-background p-4 rounded-lg">
        <div className="space-y-4">
          <div className="flex justify-end">
            <DashboardFilter onApply={setFilters} />
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