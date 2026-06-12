"use client";

import { useState, useRef } from "react";
import { useAppStore } from "../store/AppProvider";
import { Category } from "../../domain/entities/Category";
import { SpendItem } from "../../domain/entities/SpendItem";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Upload, AlertCircle, FileUp, CheckCircle2 } from "lucide-react";

// Robust native CSV parser to handle commas inside quotes safely without 3rd party libraries
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"';
      i++; // Skip escaped quote
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else if (char !== '\r') {
      currentCell += char;
    }
  }
  if (currentRow.length || currentCell) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }
  return rows.filter(r => r.some(cell => cell !== "")); // Remove pure empty rows
}

export function ImportCSVDialog({ onImported }: { onImported: () => void }) {
  const { categoryRepo, spendRepo } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !categoryRepo || !spendRepo) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setWarning(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        
        if (parsed.length < 2) throw new Error("CSV file is empty or missing headers.");

        const headers = parsed[0].map(h => h.toLowerCase());
        
        const txnIdIdx = headers.findIndex(h => h.includes("transaction id") || h === "txn id" || h === "id");
        const catIdx = headers.findIndex(h => h.includes("category name") || h === "category");
        const budgetIdx = headers.findIndex(h => h.includes("budget"));
        const itemIdx = headers.findIndex(h => h.includes("item name") || h === "item");
        const descIdx = headers.findIndex(h => h.includes("description"));
        const totalIdx = headers.findIndex(h => h.includes("total amount") || h.includes("total"));
        const paidIdx = headers.findIndex(h => h.includes("amount paid") || h.includes("paid"));
        const dateIdx = headers.findIndex(h => h === "date" || h.includes("payment date"));
        const lastDateIdx = headers.findIndex(h => h.includes("last date"));

        if (catIdx === -1) throw new Error("Missing required column: Category Name");

        const existingCategories = await categoryRepo.findAll();
        const existingSpends = await spendRepo.findByDateRange(new Date("2000-01-01"), new Date("2100-01-01"));
        
        let newTransactionsCount = 0;
        let skippedDuplicatesCount = 0;
        let synchronizedCategoriesCount = 0;

        for (let i = 1; i < parsed.length; i++) {
          const row = parsed[i];
          const catName = row[catIdx];
          if (!catName) continue;
          
          const rawBudget = budgetIdx !== -1 ? Number(row[budgetIdx]) : 0;
          const budget = isNaN(rawBudget) ? 0 : rawBudget;

          let targetCatId = "";
          const existingCatIndex = existingCategories.findIndex(c => c.name.toLowerCase() === catName.toLowerCase());
          const existingCat = existingCategories[existingCatIndex];
          
          if (existingCat) {
            targetCatId = existingCat.id;
            if (budgetIdx !== -1 && existingCat.allocatedBudget !== budget) {
              await categoryRepo.updateBudget(targetCatId, budget);
              existingCategories[existingCatIndex] = new Category(
                existingCat.id,
                existingCat.name,
                budget,
                existingCat.createdAt
              );
              synchronizedCategoriesCount++;
            }
          } else {
            targetCatId = crypto.randomUUID();
            const newCat = new Category(targetCatId, catName, budget, new Date());
            await categoryRepo.save(newCat);
            existingCategories.push(newCat); 
            synchronizedCategoriesCount++;
          }

          const itemName = itemIdx !== -1 ? row[itemIdx] : "";
          if (itemName) {
            const txnIdStr = txnIdIdx !== -1 ? row[txnIdIdx].replace(/"/g, '').replace(/^\uFEFF/, '').trim() : "";
            const desc = descIdx !== -1 ? row[descIdx] : null;
            const total = totalIdx !== -1 ? Number(row[totalIdx]) || 0 : 0;
            const paid = paidIdx !== -1 ? Number(row[paidIdx]) || 0 : 0;
            
            const dateStr = dateIdx !== -1 ? row[dateIdx] : "";
            let date = new Date();
            if (dateStr) {
              const parts = dateStr.split('/');
              if (parts.length === 3 && parts[2].length === 4) {
                date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00Z`);
              } else {
                date = new Date(dateStr);
              }
            }

            const isDuplicate = existingSpends.some(s => {
              const existingTxnId = s.transactionId || s.id;
              
              if (txnIdStr !== "" && existingTxnId === txnIdStr) {
                return true; 
              }
              
              const matchesName = s.itemName.toLowerCase() === itemName.trim().toLowerCase();
              const matchesTotal = s.totalAmount === total;
              
              const sDateStr = s.date.toISOString().split('T')[0];
              const importDateStr = !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : "";
              const matchesDate = sDateStr === importDateStr;

              return matchesName && matchesTotal && matchesDate;
            });

            if (isDuplicate) {
              skippedDuplicatesCount++;
              continue; 
            }

            const lastDateStr = lastDateIdx !== -1 ? row[lastDateIdx] : "";
            const lastDate = lastDateStr && lastDateStr.toLowerCase() !== "not set" ? new Date(lastDateStr) : null;
            
            const finalTxnId = txnIdStr || `TXN-${Date.now()}${i}`;

            const newSpend = new SpendItem(
              crypto.randomUUID(), targetCatId, itemName, desc, total, paid, date, null, lastDate, finalTxnId
            );
            await spendRepo.save(newSpend);
            existingSpends.push(newSpend); 
            newTransactionsCount++;
          }
        }

        // --- DYNAMIC & FACTUAL MESSAGE ENGINE ---
        let resultMessage = "";
        let isWarningState = false;

        if (newTransactionsCount > 0) {
          resultMessage = `Imported ${newTransactionsCount} transaction(s). `;
          if (skippedDuplicatesCount > 0) resultMessage += `Skipped ${skippedDuplicatesCount} duplicate(s).`;
        } else if (skippedDuplicatesCount > 0) {
          resultMessage = `No new transactions imported. Safely skipped ${skippedDuplicatesCount} exact duplicate(s).`;
          isWarningState = true;
        } else if (synchronizedCategoriesCount > 0) {
          resultMessage = `Synchronized ${synchronizedCategoriesCount} category/categories. No transactions found.`;
        } else {
          resultMessage = "No new data or transactions found in the CSV.";
          isWarningState = true;
        }

        if (isWarningState) {
          setWarning(resultMessage);
        } else {
          setSuccess(resultMessage);
        }

        // --- CRITICAL UNMOUNT FIX ---
        // Delay calling onImported(). If called immediately, the parent popover unmounts 
        // the dialog, preventing the user from ever seeing the message above!
        setTimeout(() => {
          setIsOpen(false);
          onImported();
        }, 4000);

      } catch (err: any) {
        setError(err.message || "Failed to parse CSV file.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) { setError(null); setSuccess(null); setWarning(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-2 h-9 bg-background w-full justify-start border-none shadow-none text-xs font-normal px-2 py-1.5 hover:bg-muted rounded-sm">
          <Upload className="h-4 w-4 opacity-70" />
          <span className="truncate">Import CSV</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Data Backup</DialogTitle>
          <DialogDescription>
            Upload a CSV file to restore categories, budgets, and transactions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="h-8 w-8 text-muted-foreground mb-3" />
            <span className="text-sm font-medium">{isProcessing ? "Processing File..." : "Click to select a CSV file"}</span>
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} disabled={isProcessing} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          {/* New Warning state for displaying accurate duplicate skips */}
          {warning && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md dark:bg-amber-950/50 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" /><span>{warning}</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-3 rounded-md dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" /><span>{success}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}