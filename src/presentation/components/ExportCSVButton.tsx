"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useAppStore } from "../store/AppProvider";

export function ExportCSVButton() {
  const { categoryRepo, spendRepo } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!categoryRepo || !spendRepo) return;
    setIsExporting(true);
    
    try {
      const categories = await categoryRepo.findAll();
      const spends = await spendRepo.findByDateRange(new Date(0), new Date("2100-01-01"));

      const headers = [
        "Category Name", 
        "Category Budget", 
        "Item Name", 
        "Description", 
        "Total Amount", 
        "Amount Paid", 
        "Date", 
        "Last Date of Payment"
      ];
      
      const rows: string[] = [headers.join(",")];
      const catMap = new Map(categories.map(c => [c.id, c]));
      const categoriesWithSpends = new Set<string>();

      // 1. Export all transactions mapped to their parent category & budget
      spends.forEach(spend => {
        categoriesWithSpends.add(spend.categoryId);
        const cat = catMap.get(spend.categoryId);
        if (!cat) return;
        
        const row = [
          `"${cat.name.replace(/"/g, '""')}"`,
          cat.allocatedBudget,
          `"${spend.itemName.replace(/"/g, '""')}"`,
          `"${(spend.description || "").replace(/"/g, '""')}"`,
          spend.totalAmount,
          spend.amountPaid,
          spend.date.toISOString(),
          spend.lastDateOfPayment ? spend.lastDateOfPayment.toISOString() : ""
        ];
        rows.push(row.join(","));
      });

      // 2. Safely export categories that have ZERO transactions so their budgets aren't lost
      categories.forEach(cat => {
        if (!categoriesWithSpends.has(cat.id)) {
          const row = [
            `"${cat.name.replace(/"/g, '""')}"`,
            cat.allocatedBudget,
            "", "", "", "", "", "" // Empty transaction fields
          ];
          rows.push(row.join(","));
        }
      });

      const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `financehub_backup_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="flex items-center space-x-2 h-9 bg-background">
      <Download className="h-4 w-4" />
      <span>Export CSV</span>
    </Button>
  );
}