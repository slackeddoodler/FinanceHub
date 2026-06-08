"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "../store/AppProvider";
import { Category } from "../../domain/entities/Category";
import { DashboardFilters } from "../../domain/use-cases/CalculateMetricsUseCase";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Filter, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function DashboardFilter({ onApply }: { onApply: (filters: DashboardFilters) => void }) {
  const { categoryRepo } = useAppStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [categoryId, setCategoryId] = useState("ALL");

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  useEffect(() => {
    if (categoryRepo) categoryRepo.findAll().then(setCategories);
  }, [categoryRepo]);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_date_filters");
      if (saved) {
        try {
          const p = JSON.parse(saved);
          setStartDate(p.startDate ? new Date(p.startDate) : undefined);
          setEndDate(p.endDate ? new Date(p.endDate) : undefined);
        } catch (e) {}
      } else {
        setStartDate(undefined);
        setEndDate(undefined);
      }
    }
  }, [isOpen]);

  const handleApply = () => {
    const s = startDate ? new Date(startDate) : undefined;
    if (s) s.setHours(0, 0, 0, 0);

    const e = endDate ? new Date(endDate) : undefined;
    if (e) e.setHours(23, 59, 59, 999);

    onApply({ startDate: s, endDate: e, categoryId });
    setIsOpen(false); 
  };

  const handleClear = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setCategoryId("ALL");
    onApply({ categoryId: "ALL", startDate: undefined, endDate: undefined });
    setIsOpen(false); 
  };

  const hasFilters = startDate !== undefined || endDate !== undefined || categoryId !== "ALL";
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="flex items-center gap-2">
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear} className="flex items-center space-x-1.5 text-muted-foreground hover:text-foreground h-9 animate-in fade-in slide-in-from-right-2 duration-200">
          <X className="h-3.5 w-3.5" />
          <span>Clear Filters</span>
        </Button>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2 h-9">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-4" align="end">
          <h4 className="font-semibold text-sm leading-none">Filter Dashboard</h4>
          
          <div className="space-y-2">
            <Label className="text-xs">Category</Label>
            {/* CRITICAL FIX: position="popper" removed, max-h and SelectGroup added */}
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectGroup>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2 flex flex-col">
              <Label className="text-xs mb-1">Start Date</Label>
              <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9 px-2", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3 w-3 shrink-0" />
                    <span className="text-xs truncate">{startDate ? format(startDate, "PPP") : "Select date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setIsStartOpen(false); }} />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2 flex flex-col">
              <Label className="text-xs mb-1">End Date</Label>
              <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9 px-2", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3 w-3 shrink-0" />
                    <span className="text-xs truncate">{endDate ? format(endDate, "PPP") : "Select date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setIsEndOpen(false); }} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t mt-3">
            <Label className="text-xs mb-1">Quick Select (Month, Quarter & Year)</Label>
            
            <div className="grid grid-cols-3 gap-2">
              {/* CRITICAL FIX: position="popper" removed, max-h and SelectGroup added */}
              <Select onValueChange={(val) => {
                const monthIdx = parseInt(val);
                const y = startDate ? startDate.getFullYear() : new Date().getFullYear();
                setStartDate(new Date(y, monthIdx, 1));
                setEndDate(new Date(y, monthIdx + 1, 0));
              }}>
                <SelectTrigger className="h-9 text-xs px-2 w-full"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectGroup>
                    {months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* CRITICAL FIX: position="popper" removed, max-h and SelectGroup added */}
              <Select onValueChange={(val) => {
                const q = parseInt(val);
                const y = startDate ? startDate.getFullYear() : new Date().getFullYear();
                let mStart = 0, mEnd = 2;
                if (q === 1) { mStart = 0; mEnd = 2; }
                if (q === 2) { mStart = 3; mEnd = 5; }
                if (q === 3) { mStart = 6; mEnd = 8; }
                if (q === 4) { mStart = 9; mEnd = 11; }
                setStartDate(new Date(y, mStart, 1));
                setEndDate(new Date(y, mEnd + 1, 0));
              }}>
                <SelectTrigger className="h-9 text-xs px-2 w-full"><SelectValue placeholder="Qtr" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectGroup>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* CRITICAL FIX: position="popper" removed, max-h and SelectGroup added */}
              <Select onValueChange={(val) => {
                const y = parseInt(val);
                if (startDate && endDate && startDate.getMonth() === endDate.getMonth()) {
                  const monthIdx = startDate.getMonth();
                  setStartDate(new Date(y, monthIdx, 1));
                  setEndDate(new Date(y, monthIdx + 1, 0));
                } else {
                  setStartDate(new Date(y, 0, 1));
                  setEndDate(new Date(y, 11, 31));
                }
              }}>
                <SelectTrigger className="h-9 text-xs px-2 w-full"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectGroup>
                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button className="w-full text-xs" onClick={handleApply}>Apply Filters</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}