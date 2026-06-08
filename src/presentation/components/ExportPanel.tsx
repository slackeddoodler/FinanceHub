"use client";

import { useState } from "react";
import { exportDashboardToPDF, backupDatabase } from "../lib/exportUtils";
import { Button } from "@/components/ui/button";
import { DownloadCloud } from "lucide-react";

export function ExportPanel() {
  const [isExporting, setIsExporting] = useState(false);

  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      await exportDashboardToPDF("dashboard-report-area");
    } catch (error) {
      console.error("PDF Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Button variant="outline" size="sm" onClick={handlePDFExport} disabled={isExporting} className="h-9">
        <DownloadCloud className="h-4 w-4 mr-2" />
        <span>{isExporting ? "Exporting..." : "Export PDF"}</span>
      </Button>

      <Button variant="outline" size="sm" onClick={() => backupDatabase()} className="h-9">
        💾 Backup Database
      </Button>
    </div>
  );
}