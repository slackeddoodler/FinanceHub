"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { useAppStore } from "../store/AppProvider";
import { SpendItem } from "../../domain/entities/SpendItem";
import { Category } from "../../domain/entities/Category";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

export function ImportCSVDialog({ onImported }: { onImported: () => void }) {
  const { spendRepo, categoryRepo } = useAppStore();
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseDate = (dateStr: string | undefined) => {
    if (!dateStr || String(dateStr).trim() === "Not Set") return null;
    const parts = String(dateStr).split('/');
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0, 0);
    }
    const fallback = new Date(dateStr);
    fallback.setHours(12, 0, 0, 0);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !spendRepo || !categoryRepo) return;

    setIsProcessing(true);
    setStatus({ type: 'idle', message: 'Reading file...' });

    try {
      const text = await file.text();
      
      let csvDataToParse = text;
      
      // CRITICAL FIX: Mathematically slice the string starting at the exact header sequence.
      // This perfectly ignores all legacy summary text, empty lines, and excel commas.
      const newHeaderStart = text.indexOf("Date of Payment,Category,Item Name");
      const oldHeaderStart = text.indexOf("Date,Category,Item Name");

      if (newHeaderStart !== -1) {
        csvDataToParse = text.substring(newHeaderStart);
      } else if (oldHeaderStart !== -1) {
        csvDataToParse = text.substring(oldHeaderStart);
      }

      Papa.parse(csvDataToParse.trim(), {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rows = results.data as any[];
            if (rows.length === 0) throw new Error("No valid transactions found.");

            const existingCategories = await categoryRepo.findAll();
            let importCount = 0;

            for (const row of rows) {
              const rawDate = row["Date of Payment"] || row["Date"];
              
              if (!rawDate || !row["Item Name"] || !row["Total Amount"]) continue;

              const categoryName = row["Category"] || "Uncategorized";
              
              let cat = existingCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
              if (!cat) {
                cat = new Category(crypto.randomUUID(), categoryName, 0, new Date());
                await categoryRepo.save(cat);
                existingCategories.push(cat); 
              }

              const parsedDate = parseDate(rawDate);
              if (!parsedDate) continue;

              const parsedDueDate = parseDate(row["Due Date"]);
              const totalAmount = Number(String(row["Total Amount"]).replace(/[^0-9.-]+/g,"")) || 0;
              const amountPaid = Number(String(row["Amount Paid"] || "0").replace(/[^0-9.-]+/g,"")) || 0;

              const newItem = new SpendItem(
                crypto.randomUUID(),
                cat.id,
                row["Item Name"],
                null,
                totalAmount,
                amountPaid,
                parsedDate,
                null,
                parsedDueDate
              );

              await spendRepo.save(newItem);
              importCount++;
            }

            if (importCount === 0) {
                throw new Error("Columns mismatched or rows empty. Check CSV format.");
            }

            setStatus({ type: 'success', message: `Successfully imported ${importCount} transactions.` });
            onImported();
            
            setTimeout(() => { setOpen(false); setStatus({ type: 'idle', message: '' }); }, 2000);

          } catch (err: any) {
            setStatus({ type: 'error', message: err.message || "Failed to process database records." });
          }
        },
        error: (err: any) => {
          setStatus({ type: 'error', message: `CSV Parser Error: ${err.message}` });
        }
      });
    } catch (err) {
      setStatus({ type: 'error', message: "Failed to read the file. Ensure it is a valid CSV." });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setStatus({ type: 'idle', message: '' }); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <UploadCloud className="h-4 w-4 mr-2" />
          <span>Import CSV</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogDescription>
            Upload a previously exported FinanceHub CSV to restore your ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-3 bg-muted/20 hover:bg-muted/40 transition-colors relative">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Click to select a CSV file</p>
              <p className="text-xs text-muted-foreground">Formats accepted: .csv</p>
            </div>
            <Input 
              ref={fileInputRef}
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {status.type === 'success' && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 p-3 rounded-md">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{status.message}</span>
            </div>
          )}

          {status.type === 'error' && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{status.message}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}