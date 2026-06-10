"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { CalculateSpendTrendUseCase, TimeFrame } from "../../domain/use-cases/CalculateSpendTrendUseCase";
import { formatINR } from "../lib/currency";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// CRITICAL UI UPGRADE: Reusable Modern Dropdown ensuring 100% application uniformity
function ModernSelect({ value, onValueChange, options, placeholder, className }: { value?: string, onValueChange: (val: string) => void, options: {label: string, value: string}[], placeholder: string, className?: string }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = value ? options.find(o => o.value === value)?.label : placeholder;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-between font-normal px-3", className)}>
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-1 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-1 shadow-lg" style={{ width: 'var(--radix-popover-trigger-width)' }} align="start">
        <div className="max-h-[200px] overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => { onValueChange(opt.value); setOpen(false); }}
                className={cn("flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-muted transition-colors", isSelected && "bg-primary/10 text-primary font-medium")}
              >
                <span className="truncate pr-4">{opt.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
        
        {/* CRITICAL FIX: Integrated ModernSelect architecture tied directly to the TimeFrame state */}
        <ModernSelect
          value={timeframe}
          onValueChange={(val) => setTimeframe(val as TimeFrame)}
          options={[
            { label: "Daily", value: "daily" },
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" }
          ]}
          placeholder="Select timeframe"
          className="w-[150px] h-9"
        />
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