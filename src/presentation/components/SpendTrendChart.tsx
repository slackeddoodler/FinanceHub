"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { CalculateSpendTrendUseCase, TimeFrame } from "../../domain/use-cases/CalculateSpendTrendUseCase";
import { formatINR } from "../lib/currency";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SpendTrendChart({ refreshTrigger, filters }: { refreshTrigger: number, filters?: any }) {
  const { spendRepo } = useAppStore();
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<TimeFrame>("daily");

  useEffect(() => {
    if (!spendRepo) return;
    
    const fetchTrend = async () => {
      const useCase = new CalculateSpendTrendUseCase(spendRepo);
      const data = await useCase.execute(timeframe, filters);
      setChartData(data);
    };
    
    fetchTrend();
  }, [spendRepo, timeframe, refreshTrigger, filters]);

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Expenditure Trend</CardTitle>
        <Select value={timeframe} onValueChange={(val) => setTimeframe(val as TimeFrame)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-[400px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="timeLabel" />
            <YAxis />
            <Tooltip formatter={(value: any) => formatINR(Number(value))} />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#8884d8" 
              strokeWidth={3} 
              dot={{ r: 4 }} 
              activeDot={{ r: 6 }} 
              name="Total Spent" 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}