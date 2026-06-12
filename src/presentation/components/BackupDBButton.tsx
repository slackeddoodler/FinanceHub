"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export function BackupDBButton({ onBackupComplete }: { onBackupComplete?: () => void }) {
  const { categoryRepo, spendRepo } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJSON = async () => {
    if (!categoryRepo || !spendRepo) return;
    setIsExporting(true);

    try {
      const categories = await categoryRepo.findAll();
      const spends = await spendRepo.findByDateRange(new Date(0), new Date("2100-01-01"));

      const backupData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        categories,
        spends,
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute("download", `financehub_backup_${dateStr}.json`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      // Slight delay to ensure download initiates before parent dropdown unmounts
      setTimeout(() => {
        if (onBackupComplete) onBackupComplete();
      }, 300);
    } catch (error) {
      console.error("Database Backup failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={isExporting} className="flex items-center space-x-2 h-9 bg-background w-full justify-start border-none shadow-none text-xs font-normal px-2 py-1.5 hover:bg-muted rounded-sm">
      <Save className="h-4 w-4 opacity-70 shrink-0" />
      <span className="truncate">{isExporting ? "Backing up..." : "Backup DB"}</span>
    </Button>
  );
}