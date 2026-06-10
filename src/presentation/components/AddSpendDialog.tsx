"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "../store/AppProvider";
import { Category } from "../../domain/entities/Category";
import { SpendItem } from "../../domain/entities/SpendItem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Reusable Modern Dropdown
function ModernSelect({ value, onValueChange, options, placeholder, className }: { value?: string, onValueChange: (val: string) => void, options: {label: string, value: string}[], placeholder: string, className?: string }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = value ? options.find(o => o.value === value)?.label : placeholder;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-between font-normal px-2 w-full", className)}>
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-1 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-1 shadow-lg" style={{ width: 'var(--radix-popover-trigger-width)' }} align="start">
        <div className="max-h-[200px] overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => { onValueChange(opt.value); setOpen(false); }}
                className={cn("flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-muted transition-colors", isSelected && "bg-primary/10 text-primary font-medium")}
              >
                <span className="truncate pr-4">{opt.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AddSpendDialog({ onSpendAdded }: { onSpendAdded: () => void }) {
  const { spendRepo, categoryRepo } = useAppStore();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form State
  const [categoryId, setCategoryId] = useState<string>("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  
  // Date State
  const [date, setDate] = useState<Date>(new Date());
  const [lastDateOfPayment, setLastDateOfPayment] = useState<Date | undefined>(undefined);

  // UI State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDuePickerOpen, setIsDuePickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && categoryRepo) {
      categoryRepo.findAll().then(cats => {
        setCategories([...cats].sort((a, b) => a.name.localeCompare(b.name)));
      });
    }
  }, [open, categoryRepo]);

  useEffect(() => {
    if (!open) {
      setCategoryId("");
      setItemName("");
      setDescription("");
      setTotalAmount("");
      setAmountPaid("");
      setDate(new Date());
      setLastDateOfPayment(undefined);
    }
  }, [open]);

  const handleSave = async () => {
    if (!spendRepo || !categoryId || !itemName || !totalAmount) return;
    
    setIsSaving(true);
    try {
      const finalDate = new Date(date);
      finalDate.setHours(12, 0, 0, 0);
      
      let finalDueDate = null;
      if (lastDateOfPayment) {
        finalDueDate = new Date(lastDateOfPayment);
        finalDueDate.setHours(12, 0, 0, 0);
      }

      const newSpend = new SpendItem(
        crypto.randomUUID(),
        categoryId,
        itemName,
        description.trim() || null,
        Number(totalAmount) || 0,
        Number(amountPaid) || 0,
        finalDate,
        null,
        finalDueDate
      );

      await spendRepo.save(newSpend);
      onSpendAdded();
      setOpen(false);
    } catch (error) {
      console.error("Failed to add transaction:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = categoryId && itemName.trim() !== "" && totalAmount !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* CRITICAL FIX: Updated text length ensures identical horizontal padding and symmetrical size with "+ New Category" */}
        <Button>+ Log Expense</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Expense</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          
          <div className="space-y-2">
            <Label className="text-xs font-medium">Category <span className="text-destructive">*</span></Label>
            <ModernSelect
              value={categoryId}
              onValueChange={setCategoryId}
              options={categories.map(c => ({ label: c.name, value: c.id }))}
              placeholder="Select Category"
              className="h-10 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Item Name <span className="text-destructive">*</span></Label>
              <Input 
                placeholder="E.g., Internet Bill" 
                value={itemName} 
                onChange={e => setItemName(e.target.value)} 
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Description</Label>
              <Input 
                placeholder="Optional details" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Total Amount <span className="text-destructive">*</span></Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={totalAmount} 
                onChange={e => setTotalAmount(e.target.value)} 
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Amount Paid</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={amountPaid} 
                onChange={e => setAmountPaid(e.target.value)} 
                className="h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col">
              <Label className="text-xs font-medium">Payment Date <span className="text-destructive">*</span></Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10 px-3", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="text-sm truncate">{date ? format(date, "PPP") : "Select date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar 
                    mode="single" 
                    selected={date} 
                    onSelect={(d) => { 
                      if(d) { 
                        setDate(d); 
                        setIsDatePickerOpen(false); 
                        if (lastDateOfPayment && d > lastDateOfPayment) {
                          setLastDateOfPayment(undefined);
                        }
                      } 
                    }} 
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 flex flex-col">
              <Label className="text-xs font-medium">Due Date</Label>
              <Popover open={isDuePickerOpen} onOpenChange={setIsDuePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10 px-3", !lastDateOfPayment && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="text-sm truncate">{lastDateOfPayment ? format(lastDateOfPayment, "PPP") : "Optional"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar 
                    mode="single" 
                    selected={lastDateOfPayment} 
                    onSelect={(d) => { 
                      setLastDateOfPayment(d); 
                      if (d) setIsDuePickerOpen(false); 
                    }} 
                    disabled={(calendarDate) => {
                      const boundary = new Date(date);
                      boundary.setHours(0, 0, 0, 0);
                      return calendarDate < boundary;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving || !isFormValid} className="w-full">
            {isSaving ? "Saving..." : "Log Expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}