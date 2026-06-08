"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { AddCategoryUseCase } from "../../domain/use-cases/AddCategoryUseCase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddCategoryDialog({ onCategoryAdded }: { onCategoryAdded: () => void }) {
  const { categoryRepo } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!categoryRepo) return;

    try {
      const useCase = new AddCategoryUseCase(categoryRepo);
      await useCase.execute(name, Number(budget));
      
      setIsOpen(false);
      setName("");
      setBudget("");
      onCategoryAdded(); // Trigger UI refresh
    } catch (err: any) {
      setError(err.message || "Failed to add category");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>+ New Category</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Budget Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Allocated Budget (₹)</Label>
            <Input id="budget" type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full">Save Category</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}