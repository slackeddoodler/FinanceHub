"use client";

import { useState, useRef } from "react";
import { useAppStore } from "../store/AppProvider";
import { Category } from "../../domain/entities/Category";
import { SpendItem } from "../../domain/entities/SpendItem";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { UploadCloud, AlertCircle, FileUp, CheckCircle2 } from "lucide-react";

export function RestoreDBDialog({ onRestored }: { onRestored: () => void }) {
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
        const parsed = JSON.parse(text);
        
        if (!parsed.categories || !parsed.spends) {
            throw new Error("Invalid backup format. Missing 'categories' or 'spends' payload.");
        }

        const existingCategories = await categoryRepo.findAll();
        const existingSpends = await spendRepo.findByDateRange(new Date("2000-01-01"), new Date("2100-01-01"));
        
        let newTransactionsCount = 0;
        let skippedDuplicatesCount = 0;
        let synchronizedCategoriesCount = 0;

        // 1. Process and Link Categories
        for (const catData of parsed.categories) {
          const catName = catData.name || catData.categoryName;
          if (!catName) continue;

          const budget = Number(catData.allocatedBudget) || 0;
          let targetCatId = catData.id;
          
          const existingCatIndex = existingCategories.findIndex(c => c.id === targetCatId || c.name.toLowerCase() === catName.toLowerCase());
          const existingCat = existingCategories[existingCatIndex];

          if (existingCat) {
            targetCatId = existingCat.id; // Map to true local ID if matched natively
            if (existingCat.allocatedBudget !== budget) {
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
            targetCatId = catData.id || crypto.randomUUID();
            const newCat = new Category(
                targetCatId, 
                catName, 
                budget, 
                catData.createdAt ? new Date(catData.createdAt) : new Date()
            );
            await categoryRepo.save(newCat);
            existingCategories.push(newCat);
            synchronizedCategoriesCount++;
          }
          
          // Store mapping so parsed spends attach to the exact synced category ID
          catData._localMappedId = targetCatId; 
        }

        // 2. Process and Deduplicate Spends
        for (let i = 0; i < parsed.spends.length; i++) {
          const spendData = parsed.spends[i];
          if (!spendData.itemName) continue;

          const txnIdStr = spendData.transactionId || spendData.id || "";
          const total = Number(spendData.totalAmount) || 0;
          const paid = Number(spendData.amountPaid) || 0;
          const date = spendData.date ? new Date(spendData.date) : new Date();

          // Link to locally resolved Category
          const catRef = parsed.categories.find((c: any) => c.id === spendData.categoryId);
          const targetCatId = catRef?._localMappedId || spendData.categoryId;

          // Strict Deduplication Guard
          const isDuplicate = existingSpends.some(s => {
            const existingTxnId = s.transactionId || s.id;
            if (txnIdStr !== "" && existingTxnId === txnIdStr) return true;
            
            const matchesName = s.itemName.toLowerCase() === spendData.itemName.trim().toLowerCase();
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

          const lastDate = spendData.lastDateOfPayment ? new Date(spendData.lastDateOfPayment) : null;
          const finalTxnId = txnIdStr || `TXN-${Date.now()}${i}`;

          const newSpend = new SpendItem(
            spendData.id || crypto.randomUUID(), 
            targetCatId, 
            spendData.itemName, 
            spendData.description || null, 
            total, 
            paid, 
            date, 
            spendData.billFileId || null, 
            lastDate, 
            finalTxnId
          );
          
          await spendRepo.save(newSpend);
          existingSpends.push(newSpend);
          newTransactionsCount++;
        }

        // Output Status Generation
        let resultMessage = "";
        let isWarningState = false;

        if (newTransactionsCount > 0) {
          resultMessage = `Restored ${newTransactionsCount} transaction(s). `;
          if (skippedDuplicatesCount > 0) resultMessage += `Skipped ${skippedDuplicatesCount} duplicate(s).`;
        } else if (skippedDuplicatesCount > 0) {
          resultMessage = `No new transactions restored. Safely skipped ${skippedDuplicatesCount} exact duplicate(s).`;
          isWarningState = true;
        } else if (synchronizedCategoriesCount > 0) {
          resultMessage = `Restored ${synchronizedCategoriesCount} category/categories. No transactions found.`;
        } else {
          resultMessage = "Database is already completely up to date with this backup.";
          isWarningState = true;
        }

        if (isWarningState) {
          setWarning(resultMessage);
        } else {
          setSuccess(resultMessage);
        }

        // Delay unmounting so user can read the success/warning message
        setTimeout(() => {
          setIsOpen(false);
          onRestored();
        }, 4000);

      } catch (err: any) {
        setError(err.message || "Failed to parse JSON backup file.");
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
          <UploadCloud className="h-4 w-4 opacity-70" />
          <span className="truncate">Restore DB</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Restore Database</DialogTitle>
          <DialogDescription>
            Upload a JSON backup file to seamlessly restore categories, budgets, and transactions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="h-8 w-8 text-muted-foreground mb-3" />
            <span className="text-sm font-medium">{isProcessing ? "Processing File..." : "Click to select a JSON backup file"}</span>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileUpload} disabled={isProcessing} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}

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