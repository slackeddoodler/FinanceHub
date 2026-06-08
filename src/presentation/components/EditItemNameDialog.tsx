"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { UpdateItemNameUseCase } from "../../domain/use-cases/ManageSpendUseCases";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export function EditItemNameDialog({ transactionId, currentName, onUpdated }: { transactionId: string, currentName: string, onUpdated: () => void }) {
  const { spendRepo } = useAppStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);

  const handleSave = async () => {
    if (!spendRepo || !name.trim()) return;
    const useCase = new UpdateItemNameUseCase(spendRepo);
    await useCase.execute(transactionId, name);
    setOpen(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader><DialogTitle>Edit Item Name</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium block mb-3">Item Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full mt-2">Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}