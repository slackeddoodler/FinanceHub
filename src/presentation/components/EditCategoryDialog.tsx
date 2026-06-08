"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { UpdateCategoryNameUseCase } from "../../domain/use-cases/ManageCategoryUseCases";
import { Category } from "../../domain/entities/Category";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export function EditCategoryDialog({ category, onUpdated }: { category: Category, onUpdated: () => void }) {
  const { categoryRepo } = useAppStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);

  const handleSave = async () => {
    if (!categoryRepo || !name.trim()) return;
    const useCase = new UpdateCategoryNameUseCase(categoryRepo);
    await useCase.execute(category.id, name);
    setOpen(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader><DialogTitle>Edit Category Name</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={handleSave} className="w-full">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}