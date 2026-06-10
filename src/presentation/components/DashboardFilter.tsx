"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "../store/AppProvider";
import { Category } from "@/domain/entities/Category";
import { Filter, CalendarIcon, ChevronDown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { DashboardFilters } from "@/domain/use-cases/CalculateMetricsUseCase";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// CRITICAL UI UPGRADE: Reusable Modern Dropdown
function ModernSelect({ value, onValueChange, options, placeholder, className }: { value?: string, onValueChange: (val: string) => void, options: {label: string, value: string}[], placeholder: string, className?: string }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = value ? options.find(o => o.value === value)?.label : placeholder;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-between font-normal px-2", className)}>
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
                className={cn("flex items-center justify-between px-2 py-1.5 text-xs rounded-sm cursor-pointer hover:bg-muted transition-colors", isSelected && "bg-primary/10 text-primary font-medium")}
              >
                <span className="truncate pr-4">{opt.label}</span>
                {isSelected && <Check className="h-3 w-3 shrink-0" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DashboardFilter({ onApply }: { onApply: (f: DashboardFilters) => void }) {
  const { categoryRepo } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // 1. Fetch and sort categories alphabetically for the dropdown
  useEffect(() => {
    if (categoryRepo) {
      categoryRepo.findAll().then((fetched) => {
        setCategories([...fetched].sort((a, b) => a.name.localeCompare(b.name)));
      });
    }
  }, [categoryRepo]);

  // 2. Sync initial Date state from sessionStorage
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_date_filters");
      if (saved) { try { const p = JSON.parse(saved); if (p.startDate) return new Date(p.startDate); } catch(e){} }
    }
    return undefined;
  });

  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_date_filters");
      if (saved) { try { const p = JSON.parse(saved); if (p.endDate) return new Date(p.endDate); } catch(e){} }
    }
    return undefined;
  });

  // 3. New State: Category Selection
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleApply = () => {
    onApply({ categoryId: selectedCategory, startDate, endDate });
    setIsOpen(false);
  };

  const handleClearFilters = () => { 
    setStartDate(undefined); 
    setEndDate(undefined); 
    setSelectedCategory("ALL");
    onApply({ categoryId: "ALL", startDate: undefined, endDate: undefined });
    setIsOpen(false); 
  };

  // Dynamically show the Clear button if ANY filter is actively modified
  const hasFilters = startDate !== undefined || endDate !== undefined || selectedCategory !== "ALL";

  return (
    <div className="flex items-center gap-2">
      {hasFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearFilters} 
          className="flex items-center space-x-1.5 text-muted-foreground hover:text-foreground h-9 animate-in fade-in slide-in-from-right-2 duration-200"
        >
          <X className="h-3.5 w-3.5" />
          <span>Clear Filters</span>
        </Button>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {/* UPDATED: Simplified button text */}
          <Button variant="outline" size="sm" className="flex items-center space-x-2 h-9 bg-background">
            <Filter className="h-4 w-4" /><span>Filter</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-4" align="end">
          <h4 className="font-semibold text-sm leading-none">Filter Dashboard</h4>
          
          {/* RESTORED & UPGRADED: Modern Category Selection */}
          <div className="space-y-2">
            <Label className="text-xs mb-1 block">Category</Label>
            <ModernSelect
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              options={[
                { label: "All Categories", value: "ALL" },
                ...categories.map(c => ({ label: c.name, value: c.id }))
              ]}
              placeholder="All Categories"
              className="w-full h-9 text-xs"
            />
          </div>

          <div className="space-y-2 pt-3 border-t">
            <Label className="text-xs mb-1 block">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2 flex flex-col">
                <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9 px-2", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3 w-3 shrink-0" />
                      <span className="text-xs truncate">{startDate ? format(startDate, "PPP") : "Start date"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setIsStartOpen(false); }} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2 flex flex-col">
                <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9 px-2", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3 w-3 shrink-0" />
                      <span className="text-xs truncate">{endDate ? format(endDate, "PPP") : "End date"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setIsEndOpen(false); }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t mt-3">
            <Label className="text-xs mb-1 block">Quick Select (Month, Quarter & Year)</Label>
            <div className="grid grid-cols-3 gap-2">
              <ModernSelect
                onValueChange={(val) => {
                  const monthIdx = parseInt(val);
                  const y = startDate ? startDate.getFullYear() : new Date().getFullYear();
                  setStartDate(new Date(y, monthIdx, 1));
                  setEndDate(new Date(y, monthIdx + 1, 0));
                }}
                options={months.map((m, i) => ({ label: m, value: i.toString() }))}
                placeholder="Month"
                className="w-full h-9 text-xs"
              />

              <ModernSelect
                onValueChange={(val) => {
                  const q = parseInt(val);
                  const y = startDate ? startDate.getFullYear() : new Date().getFullYear();
                  let mStart = 0, mEnd = 2;
                  if (q === 1) { mStart = 0; mEnd = 2; }
                  if (q === 2) { mStart = 3; mEnd = 5; }
                  if (q === 3) { mStart = 6; mEnd = 8; }
                  if (q === 4) { mStart = 9; mEnd = 11; }
                  setStartDate(new Date(y, mStart, 1));
                  setEndDate(new Date(y, mEnd + 1, 0));
                }}
                options={[
                  {label: "Q1", value: "1"}, 
                  {label: "Q2", value: "2"}, 
                  {label: "Q3", value: "3"}, 
                  {label: "Q4", value: "4"}
                ]}
                placeholder="Qtr"
                className="w-full h-9 text-xs"
              />

              <ModernSelect
                onValueChange={(val) => {
                  const y = parseInt(val);
                  if (startDate && endDate && startDate.getMonth() === endDate.getMonth()) {
                    const monthIdx = startDate.getMonth();
                    setStartDate(new Date(y, monthIdx, 1));
                    setEndDate(new Date(y, monthIdx + 1, 0));
                  } else {
                    setStartDate(new Date(y, 0, 1));
                    setEndDate(new Date(y, 11, 31));
                  }
                }}
                options={years.map(y => ({ label: y.toString(), value: y.toString() }))}
                placeholder="Year"
                className="w-full h-9 text-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button className="w-full text-xs" onClick={handleApply}>Apply Filters</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}