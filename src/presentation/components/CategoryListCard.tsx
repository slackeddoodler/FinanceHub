"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "../store/AppProvider";
import { GetTransactionsUseCase, TransactionDTO } from "../../domain/use-cases/GetTransactionsUseCase";
import { Category } from "../../domain/entities/Category";
import { DashboardFilters } from "../../domain/use-cases/CalculateMetricsUseCase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "../lib/currency";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type SortableFields = "name" | "budget" | "spent";

export function CategoryListCard({ refreshTrigger, filters }: { refreshTrigger: number, filters: DashboardFilters }) {
  const { spendRepo, categoryRepo, isDbReady } = useAppStore();
  const [data, setData] = useState<TransactionDTO[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // CRITICAL FIX: Matrix sorting states matching the Ledger's exact UI logic
  const [sortField, setSortField] = useState<SortableFields>("spent");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (!isDbReady || !spendRepo || !categoryRepo) return;
    categoryRepo.findAll().then(setCategories);
    new GetTransactionsUseCase(categoryRepo, spendRepo).execute().then(setData);
  }, [isDbReady, spendRepo, categoryRepo, refreshTrigger]);

  const categoryBreakdown = useMemo(() => {
    let filtered = data;
    if (filters.startDate) filtered = filtered.filter(d => d.date >= filters.startDate!);
    if (filters.endDate) filtered = filtered.filter(d => d.date <= filters.endDate!);
    if (filters.categoryId && filters.categoryId !== "ALL") filtered = filtered.filter(d => d.categoryId === filters.categoryId);

    const breakdown = categories.map(cat => {
      const catSpends = filtered.filter(s => s.categoryId === cat.id);
      const totalSpent = catSpends.reduce((sum, s) => sum + s.totalAmount, 0);
      return {
        id: cat.id,
        name: cat.name,
        spent: totalSpent,
        budget: cat.allocatedBudget,
        remaining: cat.allocatedBudget - totalSpent
      };
    });

    // Dynamic mathematical sorting engine
    return breakdown.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        if (valA.toLowerCase() < valB.toLowerCase()) return sortDirection === "asc" ? -1 : 1;
        if (valA.toLowerCase() > valB.toLowerCase()) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, categories, filters, sortField, sortDirection]);

  const handleSort = (field: SortableFields) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // Defaults to Descending for Spent/Budget as users want to see highest amounts first
    }
  };

  const renderSortIcon = (field: SortableFields) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary shrink-0" /> 
      : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary shrink-0" />;
  };

  return (
    <Card className="col-span-1 shadow-sm overflow-hidden flex flex-col h-full">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">Category Breakdown</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto overflow-x-hidden pr-2 flex flex-col">
        
        {/* CRITICAL FEATURE: Sorting pseudo-header mirroring the Ledger's table behavior perfectly */}
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground border-b pb-2 mb-3">
          <div 
            className="flex items-center cursor-pointer group select-none hover:text-foreground transition-colors" 
            onClick={() => handleSort("name")}
          >
            <span>Category</span>
            {renderSortIcon("name")}
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center cursor-pointer group select-none hover:text-foreground transition-colors" 
              onClick={() => handleSort("budget")}
            >
              <span>Budget</span>
              {renderSortIcon("budget")}
            </div>
            <div 
              className="flex items-center cursor-pointer group select-none hover:text-foreground transition-colors" 
              onClick={() => handleSort("spent")}
            >
              <span>Spent</span>
              {renderSortIcon("spent")}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available.</p>
          ) : (
            categoryBreakdown.map(cat => (
              <div key={cat.id} className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate pr-2">{cat.name}</span>
                  <span className="text-sm font-bold flex-shrink-0">{formatINR(cat.spent)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Budget: {formatINR(cat.budget)}</span>
                  <span className={cat.remaining < 0 ? "text-destructive" : ""}>
                    Rem: {formatINR(cat.remaining)}
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
                  <div 
                    className={`h-full rounded-full ${cat.spent > cat.budget ? 'bg-destructive' : 'bg-primary'}`} 
                    style={{ width: `${Math.min((cat.spent / (cat.budget || 1)) * 100, 100)}%` }} 
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}