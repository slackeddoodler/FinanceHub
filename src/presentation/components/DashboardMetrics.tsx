"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { CalculateMetricsUseCase } from "../../domain/use-cases/CalculateMetricsUseCase";
import { formatINR } from "../lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardMetrics({ refreshTrigger, filters }: { refreshTrigger: number, filters?: any }) {
  const { categoryRepo, spendRepo } = useAppStore();
  const [metrics, setMetrics] = useState({ totalBudget: 0, totalSpent: 0, totalPending: 0 });

  useEffect(() => {
    if (!categoryRepo || !spendRepo) return;
    
    const fetchMetrics = async () => {
      const useCase = new CalculateMetricsUseCase(categoryRepo, spendRepo);
      const data = await useCase.execute(filters);
      setMetrics(data);
    };

    fetchMetrics();
  }, [categoryRepo, spendRepo, refreshTrigger, filters]); // Re-runs instantly when a new item is added

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatINR(metrics.totalBudget)}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatINR(metrics.totalSpent)}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Bills</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold text-destructive">{formatINR(metrics.totalPending)}</div></CardContent>
      </Card>
    </div>
  );
}