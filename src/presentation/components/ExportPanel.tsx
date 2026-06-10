"use client";

import { useState, useRef } from "react";
import { useAppStore } from "../store/AppProvider";
import { exportDashboardToPDF } from "../lib/exportUtils";
import { Category } from "../../domain/entities/Category";
import { SpendItem } from "../../domain/entities/SpendItem";
import { Button } from "@/components/ui/button";
import { DownloadCloud, Database, UploadCloud } from "lucide-react";

// Optional onRestore prop allows seamless UI refreshing if passed from the parent
export function ExportPanel({ onRestore }: { onRestore?: () => void }) {
  const { categoryRepo, spendRepo } = useAppStore();
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePDFExport = async () => {
    setIsExportingPDF(true);
    try {
      await exportDashboardToPDF("dashboard-report-area");
    } catch (error) {
      console.error("PDF Export failed:", error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // 1. HIGHLY EFFICIENT JSON BACKUP
  const handleDatabaseBackup = async () => {
    if (!categoryRepo || !spendRepo) return;
    setIsBackingUp(true);
    
    try {
      const categories = await categoryRepo.findAll();
      const spends = await spendRepo.findByDateRange(new Date(0), new Date("2100-01-01"));

      // JSON natively preserves data types, structural integrity, and ISO date strings without CSV escaping hacks
      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          allocatedBudget: c.allocatedBudget,
          createdAt: c.createdAt.toISOString()
        })),
        spends: spends.map(s => ({
          id: s.id,
          categoryId: s.categoryId,
          itemName: s.itemName,
          description: s.description,
          totalAmount: s.totalAmount,
          amountPaid: s.amountPaid,
          date: s.date.toISOString(),
          billFileId: s.billFileId,
          lastDateOfPayment: s.lastDateOfPayment ? s.lastDateOfPayment.toISOString() : null
        }))
      };

      const jsonContent = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const link = document.createElement("a");
      link.setAttribute("href", jsonContent);
      link.setAttribute("download", `financehub_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Database backup failed:", error);
    } finally {
      setIsBackingUp(false);
    }
  };

  // 2. PERFECT DATABASE RESTORATION ENGINE
  const handleDatabaseRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !categoryRepo || !spendRepo) return;

    setIsRestoring(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.categories || !parsed.spends) {
          throw new Error("Invalid backup file format.");
        }

        // Restore Categories via strict Domain Entity initialization
        for (const cat of parsed.categories) {
          await categoryRepo.save(new Category(
            String(cat.id),
            String(cat.name),
            Number(cat.allocatedBudget),
            new Date(cat.createdAt)
          ));
        }

        // Restore Transactions via strict Domain Entity initialization
        for (const spend of parsed.spends) {
          await spendRepo.save(new SpendItem(
            String(spend.id),
            String(spend.categoryId),
            String(spend.itemName),
            spend.description ? String(spend.description) : null,
            Number(spend.totalAmount),
            Number(spend.amountPaid),
            new Date(spend.date),
            spend.billFileId ? String(spend.billFileId) : null,
            spend.lastDateOfPayment ? new Date(spend.lastDateOfPayment) : null
          ));
        }

        // Trigger a clean data wipe/reload on the UI level
        if (onRestore) {
          onRestore();
        } else {
          // Hard reload guarantees all charts and memoized states catch the massive data influx
          window.location.reload(); 
        }
      } catch (err) {
        console.error("Database restore failed:", err);
        alert("Failed to restore database. Please ensure you are uploading a valid FinanceHub JSON backup.");
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex gap-2 items-center">
      {/* CRITICAL FIX: Isolated loading state targeting only PDF Export */}
      <Button variant="outline" size="sm" onClick={handlePDFExport} disabled={isExportingPDF} className="h-9">
        <DownloadCloud className="h-4 w-4 mr-2 shrink-0" />
        <span>{isExportingPDF ? "Exporting..." : "Export PDF"}</span>
      </Button>

      {/* CRITICAL FIX: Isolated loading state targeting only JSON Backup */}
      <Button variant="outline" size="sm" onClick={handleDatabaseBackup} disabled={isBackingUp} className="h-9">
        <Database className="h-4 w-4 mr-2 shrink-0" />
        <span>{isBackingUp ? "Backing up..." : "Backup DB"}</span>
      </Button>

      {/* NEW FEATURE: Seamless JSON DB Restoration */}
      <div onClick={() => fileInputRef.current?.click()}>
        <Button variant="outline" size="sm" disabled={isRestoring} className="h-9">
          <UploadCloud className="h-4 w-4 mr-2 shrink-0" />
          <span>{isRestoring ? "Restoring..." : "Restore DB"}</span>
        </Button>
        <input 
          type="file" 
          accept=".json" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleDatabaseRestore} 
          disabled={isRestoring}
        />
      </div>
    </div>
  );
}