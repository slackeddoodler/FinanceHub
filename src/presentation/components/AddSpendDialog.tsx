"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "../store/AppProvider";
import { SpendItem } from "../../domain/entities/SpendItem";
import { Category } from "../../domain/entities/Category";
import { CheckBudgetAndNotifyUseCase } from "../../domain/use-cases/CheckBudgetAndNotifyUseCase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function AddSpendDialog({ onSpendAdded }: { onSpendAdded: () => void }) {
  const { spendRepo, categoryRepo } = useAppStore();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [itemName, setItemName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [error, setError] = useState(""); 
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [lastDate, setLastDate] = useState<Date | undefined>();
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isLastDateOpen, setIsLastDateOpen] = useState(false);

  useEffect(() => {
    if (categoryRepo && open) {
      categoryRepo.findAll().then(setCategories);
      setDate(new Date()); 
      setError("");
    }
  }, [categoryRepo, open]);

  const handleSave = async () => {
    if (!spendRepo || !categoryId || !itemName || !totalAmount || !date) return;

    const parsedTotal = Number(totalAmount);
    const parsedPaid = Number(amountPaid) || 0;

    if (parsedPaid > parsedTotal) {
      setError("Amount paid cannot exceed total amount.");
      return;
    }

    const parsedDate = new Date(date);
    const parsedLastDate = lastDate ? new Date(lastDate) : null;
    
    parsedDate.setHours(12, 0, 0, 0);
    if (parsedLastDate) parsedLastDate.setHours(12, 0, 0, 0);

    const newItem = new SpendItem(
      crypto.randomUUID(), categoryId, itemName, null,
      parsedTotal, parsedPaid, parsedDate, null, parsedLastDate
    );

    // 1. Save data mathematically
    await spendRepo.save(newItem);
    
    // 2. CRITICAL FEATURE: Asynchronously check budget constraints and trigger notification pipeline
    if (categoryRepo && spendRepo) {
      const budgetCheck = new CheckBudgetAndNotifyUseCase(categoryRepo, spendRepo);
      // Fired without blocking the UI rendering thread
      budgetCheck.execute(categoryId).catch(console.error);
    }
    
    setItemName(""); setTotalAmount(""); setAmountPaid(""); setLastDate(undefined); setError("");
    setOpen(false);
    onSpendAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Log Expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log New Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
          
          <Input placeholder="Item Name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" placeholder="Total Amount (INR)" value={totalAmount} onChange={(e) => { setTotalAmount(e.target.value); setError(""); }} />
            <Input type="number" placeholder="Amount Paid Now (INR)" value={amountPaid} onChange={(e) => { setAmountPaid(e.target.value); setError(""); }} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 flex flex-col">
              <label className="text-xs text-muted-foreground mb-1">Payment Date</label>
              <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setIsDateOpen(false); }} />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-1 flex flex-col">
              <label className="text-xs text-muted-foreground mb-1">Due Date (Optional)</label>
              <Popover open={isLastDateOpen} onOpenChange={setIsLastDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9", !lastDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {lastDate ? format(lastDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={lastDate} onSelect={(d) => { setLastDate(d); setIsLastDateOpen(false); }} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          <Button onClick={handleSave} className="w-full">Save Expense</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}