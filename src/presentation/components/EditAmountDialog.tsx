"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { UpdateAmountPaidUseCase } from "../../domain/use-cases/UpdateAmountPaidUseCase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

// CRITICAL FIX: Component now accepts totalAmount as a strict prop
export function EditAmountDialog({ transactionId, currentAmountPaid, totalAmount, onUpdated }: { transactionId: string, currentAmountPaid: number, totalAmount: number, onUpdated: () => void }) {
  const { spendRepo } = useAppStore();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(currentAmountPaid.toString());
  const [error, setError] = useState(""); // Math validation error state

  const handleSave = async () => {
    if (!spendRepo) return;
    const newAmount = Number(amount);
    if (isNaN(newAmount) || newAmount < 0) return;

    // CRITICAL FIX: Math validation
    if (newAmount > totalAmount) {
      setError("Amount paid cannot exceed total amount.");
      return;
    }

    const useCase = new UpdateAmountPaidUseCase(spendRepo);
    await useCase.execute(transactionId, newAmount);
    
    setOpen(false);
    setError("");
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) setError(""); }}>
      <DialogTrigger asChild>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader>
          <DialogTitle>Edit Amount Paid</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium block mb-3">New Amount (INR)</label>
            <Input 
              type="number" 
              value={amount} 
              onChange={(e) => { setAmount(e.target.value); setError(""); }} 
              min="0"
            />
            {error && <p className="text-xs text-destructive font-medium mt-1">{error}</p>}
          </div>
          <Button onClick={handleSave} className="w-full mt-2">Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}