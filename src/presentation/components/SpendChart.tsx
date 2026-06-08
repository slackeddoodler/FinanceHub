"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { CalculateMetricsUseCase } from "../../domain/use-cases/CalculateMetricsUseCase";
import { formatINR } from "../lib/currency"; // <-- Reusing our strict INR formatter
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SpendChart({ refreshTrigger, filters }: { refreshTrigger: number, filters?: any }) {
  const { categoryRepo, spendRepo } = useAppStore();
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!categoryRepo || !spendRepo) return;
    const fetchMetrics = async () => {
      const useCase = new CalculateMetricsUseCase(categoryRepo, spendRepo);
      const data = await useCase.execute(filters);
      setChartData(data.categoryChartData);
    };
    fetchMetrics();
  }, [categoryRepo, spendRepo, refreshTrigger, filters]);

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Spend vs. Budget by Category</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" />
            <YAxis />
            {/* FIX: Using 'any' satisfies Recharts' complex generic types, and Number() ensures mathematical safety */}
            <Tooltip formatter={(value: any) => formatINR(Number(value))} />
            <Legend />
            <Bar dataKey="budget" name="Allocated Budget" fill="#8884d8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="spent" name="Actual Spend" fill="#82ca9d" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}