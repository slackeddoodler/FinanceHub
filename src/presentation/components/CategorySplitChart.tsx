"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { CalculateMetricsUseCase } from "../../domain/use-cases/CalculateMetricsUseCase";
import { formatINR } from "../lib/currency";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// A clean, distinct color palette for the pie slices
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function CategorySplitChart({ refreshTrigger, filters }: { refreshTrigger: number, filters?: any }) {
  const { categoryRepo, spendRepo } = useAppStore();
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!categoryRepo || !spendRepo) return;
    
    const fetchMetrics = async () => {
      const useCase = new CalculateMetricsUseCase(categoryRepo, spendRepo);
      const data = await useCase.execute(filters);
      
      // CRITICAL: Map to Recharts format and filter out empty categories
      const pieData = data.categoryChartData
        .filter(cat => cat.spent > 0)
        .map(cat => ({
          name: cat.name,
          value: cat.spent
        }));
        
      setChartData(pieData);
    };
    
    fetchMetrics();
  }, [categoryRepo, spendRepo, refreshTrigger, filters]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Category Split</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No spending data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80} // Creates a modern Donut chart aesthetic
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              {/* Safely format the INR value exactly as we fixed in the previous phase */}
              <Tooltip formatter={(value: any) => formatINR(Number(value))} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}