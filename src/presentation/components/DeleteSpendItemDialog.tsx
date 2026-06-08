"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { DeleteSpendItemUseCase } from "../../domain/use-cases/ManageSpendUseCases";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteSpendItemDialog({ transactionId, itemName, onDeleted }: { transactionId: string, itemName: string, onDeleted: () => void }) {
  const { spendRepo } = useAppStore();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    if (!spendRepo) return;
    const useCase = new DeleteSpendItemUseCase(spendRepo);
    await useCase.execute(transactionId);
    setOpen(false);
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Trash2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all cursor-pointer shrink-0" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete Transaction?</DialogTitle>
          <DialogDescription className="pt-2 text-destructive font-medium">
            Warning: This action is permanent. Are you sure you want to completely delete "{itemName}"?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-4">
          <Button variant="destructive" className="w-full" onClick={handleDelete}>Yes, Delete Transaction</Button>
          <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}