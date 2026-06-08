"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { DeleteCategoryUseCase } from "../../domain/use-cases/ManageCategoryUseCases";
import { Category } from "../../domain/entities/Category";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteCategoryDialog({ category, onDeleted }: { category: Category, onDeleted: () => void }) {
  const { categoryRepo, spendRepo } = useAppStore();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    if (!categoryRepo || !spendRepo) return;
    const useCase = new DeleteCategoryUseCase(categoryRepo, spendRepo);
    await useCase.execute(category.id);
    setOpen(false);
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete Category?</DialogTitle>
          <DialogDescription className="pt-2 text-destructive font-medium">
            Warning: This action is permanent. Deleting "{category.name}" will also instantly delete ALL transactions associated with it.
          </DialogDescription>
        </DialogHeader>
        
        {/* CRITICAL FIX: Changed to flex-col to stack vertically, placing Delete above Cancel */}
        <div className="flex flex-col gap-2 pt-4">
          <Button variant="destructive" className="w-full" onClick={handleDelete}>Yes, Delete Everything</Button>
          <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}