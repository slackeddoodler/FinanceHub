"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import Papa from "papaparse";

export function ExportCSVButton() {
  const { categoryRepo, spendRepo } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);

  const formatForExcelDate = (date: Date | null | undefined) => {
    if (!date) return "";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${y}-${m}-${d}`; 
  };

  const formatFilenameDate = (date: Date) => {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`; 
  };

  const handleExportCSV = async () => {
    if (!categoryRepo || !spendRepo) return;
    setIsExporting(true);

    try {
      const categories = await categoryRepo.findAll();
      const spends = await spendRepo.findByDateRange(new Date(0), new Date("2100-01-01"));

      const catMap = new Map(categories.map(c => [c.id, c]));
      spends.sort((a, b) => a.date.getTime() - b.date.getTime());

      const rawData = spends.map(spend => {
        const category = catMap.get(spend.categoryId);
        const categoryName = category ? category.name : "Unknown Category";
        const categoryBudget = category ? category.allocatedBudget : 0;
        const remainingAmount = spend.totalAmount - spend.amountPaid;

        return {
          "Transaction ID": spend.id,
          "Item Name": spend.itemName,
          "Category": categoryName,
          "Category Budget": categoryBudget,
          "Total Amount": spend.totalAmount,
          "Amount Paid": spend.amountPaid,
          "Remaining": remainingAmount,
          "Date of Payment": formatForExcelDate(spend.date),
          "Due Date": formatForExcelDate(spend.lastDateOfPayment)
        };
      });

      const csvString = Papa.unparse(rawData, { header: true });
      const csvContent = "\uFEFF" + csvString;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `financehub_export_${formatFilenameDate(new Date())}.csv`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting} className="h-9">
      <Download className="h-4 w-4 mr-2 shrink-0" />
      <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
    </Button>
  );
}