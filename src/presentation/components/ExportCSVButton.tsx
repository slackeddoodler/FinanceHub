"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { exportToCSV } from "../lib/exportUtils";
import { Button } from "@/components/ui/button";
import { DownloadCloud } from "lucide-react";

export function ExportCSVButton() {
  const { spendRepo, categoryRepo } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleCSVExport = async () => {
    if (!spendRepo || !categoryRepo) return;
    setIsExporting(true);
    try {
      // Fetch all historical data across repositories
      const allSpends = await spendRepo.findByDateRange(new Date("2000-01-01"), new Date("2100-01-01"));
      const allCategories = await categoryRepo.findAll();
      exportToCSV(allCategories, allSpends);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCSVExport} disabled={isExporting} className="h-9">
      <DownloadCloud className="h-4 w-4 mr-2" />
      <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
    </Button>
  );
}