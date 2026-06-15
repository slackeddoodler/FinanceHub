"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { UpdateTotalAmountUseCase } from "../../domain/use-cases/ManageSpendUseCases";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export function EditTotalAmountDialog({ transactionId, currentTotal, amountPaid, onUpdated }: { transactionId: string, currentTotal: number, amountPaid: number, onUpdated: () => void }) {
  const { spendRepo } = useAppStore();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(currentTotal.toString());
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!spendRepo) return;
    const newAmount = Number(amount);
    if (isNaN(newAmount)) return;

    if (newAmount < 0) {
      setError("Total amount cannot be negative.");
      return;
    }

    if (newAmount < amountPaid) {
      setError("Total cannot be less than the amount already paid.");
      return;
    }

    const useCase = new UpdateTotalAmountUseCase(spendRepo);
    await useCase.execute(transactionId, newAmount);
    setOpen(false);
    setError("");
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) setError(""); }}>
      <DialogTrigger asChild>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader><DialogTitle>Edit Total Amount</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium block mb-3">Total Amount (INR)</label>
            <Input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} min="0" />
            {error && <p className="text-xs text-destructive font-medium mt-1">{error}</p>}
          </div>
          <Button onClick={handleSave} className="w-full mt-2">Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}