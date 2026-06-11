"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/presentation/store/AppProvider";
import { GetTransactionsUseCase, TransactionDTO } from "@/domain/use-cases/GetTransactionsUseCase";
import { Category } from "@/domain/entities/Category";
import { formatINR } from "@/presentation/lib/currency";
import { Filter, CalendarIcon, ChevronDown, Tags, ArrowUp, ArrowDown, ArrowUpDown, X, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { DashboardSkeleton } from "@/presentation/components/DashboardSkeleton";
import { LockScreen } from "@/presentation/components/LockScreen";
import { EditAmountDialog } from "@/presentation/components/EditAmountDialog";
import { EditLastDateDialog } from "@/presentation/components/EditLastDateDialog";
import { EditCategoryDialog } from "@/presentation/components/EditCategoryDialog";
import { DeleteCategoryDialog } from "@/presentation/components/DeleteCategoryDialog";
import { EditItemNameDialog } from "@/presentation/components/EditItemNameDialog";
import { EditTotalAmountDialog } from "@/presentation/components/EditTotalAmountDialog";
import { EditPaymentDateDialog } from "@/presentation/components/EditPaymentDateDialog";
import { DeleteSpendItemDialog } from "@/presentation/components/DeleteSpendItemDialog";
import { GlobalHeader } from "@/presentation/components/GlobalHeader";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type SortableFields = "date" | "totalAmount" | "amountPaid" | "pendingAmount" | "lastDateOfPayment";

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

export default function PersonalLedgerPage() {
  const { isDbReady, isAuthenticated, spendRepo, categoryRepo } = useAppStore();
  
  const [data, setData] = useState<TransactionDTO[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // CRITICAL FIX: Isolated Session Storage Keys for Personal Workspace
  const [activeStart, setActiveStart] = useState<Date | undefined>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_personal_date_filters");
      if (saved) { try { const p = JSON.parse(saved); if (p.startDate) return new Date(p.startDate); } catch(e){} }
    }
    return undefined;
  });

  const [activeEnd, setActiveEnd] = useState<Date | undefined>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_personal_date_filters");
      if (saved) { try { const p = JSON.parse(saved); if (p.endDate) return new Date(p.endDate); } catch(e){} }
    }
    return undefined;
  });

  const [activeFilterType, setActiveFilterType] = useState<"date" | "lastDateOfPayment">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_personal_date_filters");
      if (saved) { try { const p = JSON.parse(saved); if (p.filterType) return p.filterType; } catch(e){} }
    }
    return "date";
  });

  const [inputStart, setInputStart] = useState<Date | undefined>(activeStart);
  const [inputEnd, setInputEnd] = useState<Date | undefined>(activeEnd);
  const [inputFilterType, setInputFilterType] = useState<"date" | "lastDateOfPayment">(activeFilterType);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("financehub_personal_date_filters", JSON.stringify({
        startDate: activeStart ? activeStart.toISOString() : null,
        endDate: activeEnd ? activeEnd.toISOString() : null,
        filterType: activeFilterType
      }));
    }
  }, [activeStart, activeEnd, activeFilterType]);

  useEffect(() => {
    if (isFilterOpen && typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_personal_date_filters");
      if (saved) {
        try {
          const p = JSON.parse(saved);
          setInputStart(p.startDate ? new Date(p.startDate) : undefined);
          setInputEnd(p.endDate ? new Date(p.endDate) : undefined);
          setInputFilterType(p.filterType || "date");
        } catch(e) {}
      } else {
        setInputStart(undefined); 
        setInputEnd(undefined);
        setInputFilterType("date");
      }
    }
  }, [isFilterOpen]);
  
  const [activeCats, setActiveCats] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_personal_active_cats");
      if (saved) { try { return JSON.parse(saved); } catch(e){} }
    }
    return [];
  });
  
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const [sortField, setSortField] = useState<SortableFields>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("financehub_personal_active_cats", JSON.stringify(activeCats));
    }
  }, [activeCats]);

  const handleDataRefresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    if (!isDbReady || !isAuthenticated || !spendRepo || !categoryRepo) return;
    
    categoryRepo.findAll().then((fetchedCategories) => {
      const alphabeticallySorted = [...fetchedCategories].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setCategories(alphabeticallySorted);
    });

    new GetTransactionsUseCase(categoryRepo, spendRepo).execute().then(setData);
  }, [isDbReady, isAuthenticated, spendRepo, categoryRepo, refreshTrigger]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      let matchesCat = activeCats.length === 0 || activeCats.includes(item.categoryId);
      
      const targetDate = item[activeFilterType];

      let matchesStart = true;
      if (activeStart) {
        matchesStart = targetDate ? targetDate >= activeStart : false;
      }

      let matchesEnd = true;
      if (activeEnd) {
        const e = new Date(activeEnd);
        e.setHours(23, 59, 59, 999);
        matchesEnd = targetDate ? targetDate <= e : false;
      }
      
      return matchesCat && matchesStart && matchesEnd;
    });
  }, [data, activeCats, activeStart, activeEnd, activeFilterType]);

  const groupedCategories = useMemo(() => {
    const visibleCats = activeCats.length === 0 ? categories : categories.filter(c => activeCats.includes(c.id));
    return visibleCats.map(cat => {
      const catSpends = filteredData.filter(item => item.categoryId === cat.id);
      
      catSpends.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (valA instanceof Date) valA = valA.getTime();
        if (valB instanceof Date) valB = valB.getTime();

        if (sortField === "lastDateOfPayment") {
          if (!valA) return sortDirection === "asc" ? 1 : -1;
          if (!valB) return sortDirection === "asc" ? -1 : 1;
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });

      const totalCommitted = catSpends.reduce((sum, item) => sum + item.totalAmount, 0);
      return {
        ...cat,
        spends: catSpends,
        remainingBudget: cat.allocatedBudget - totalCommitted,
      };
    });
  }, [categories, filteredData, activeCats, sortField, sortDirection]);

  const handleSort = (field: SortableFields) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc"); 
    }
  };

  const renderSortIcon = (field: SortableFields) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary shrink-0" /> 
      : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary shrink-0" />;
  };

  const handleApplyDates = () => {
    if (inputStart) { const s = new Date(inputStart); s.setHours(0,0,0,0); setActiveStart(s); } else setActiveStart(undefined);
    if (inputEnd) { const e = new Date(inputEnd); e.setHours(23,59,59,999); setActiveEnd(e); } else setActiveEnd(undefined);
    setActiveFilterType(inputFilterType);
    setIsFilterOpen(false); 
  };
  
  const handleClearDates = () => { 
    setInputStart(undefined); setInputEnd(undefined); 
    setActiveStart(undefined); setActiveEnd(undefined); 
    setIsFilterOpen(false); 
  };
  
  const hasDateFilters = activeStart !== undefined || activeEnd !== undefined;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  if (!isDbReady) return <DashboardSkeleton />;
  if (!isAuthenticated) return <LockScreen />;

  return (
    <main className="min-h-screen bg-background text-foreground p-8 space-y-6">
      
      {/* GLOBAL HEADER IS INJECTED HERE */}
      <GlobalHeader 
        title="Personal Ledger" 
        subtitle="Your secure, isolated transaction tracker." 
        activePage="ledger" 
        handleDataRefresh={handleDataRefresh} 
      />

      <div className="space-y-2">
        <div className="flex justify-end items-center gap-2 pt-2 pb-4">
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center space-x-2 h-9 bg-background">
                <Tags className="h-4 w-4" />
                <span>Categories {activeCats.length > 0 ? `(${activeCats.length})` : ""}</span>
                <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 shadow-lg" align="end">
              <div className="p-3 border-b flex items-center justify-between bg-muted/20">
                <h4 className="font-semibold text-sm">Filter Categories</h4>
                {activeCats.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" onClick={() => setActiveCats([])}>
                    Clear All
                  </Button>
                )}
              </div>
              <div className="p-1 max-h-[300px] overflow-y-auto flex flex-col gap-0.5">
                <div 
                  className={cn("flex items-center justify-between px-2 py-2 text-sm rounded-md cursor-pointer hover:bg-muted transition-colors", activeCats.length === 0 && "bg-primary/10 text-primary font-medium")}
                  onClick={() => setActiveCats([])}
                >
                  <span>All Categories</span>
                  {activeCats.length === 0 && <Check className="h-4 w-4" />}
                </div>
                {categories.map((c) => {
                  const isSelected = activeCats.includes(c.id);
                  return (
                    <div 
                      key={c.id} 
                      className={cn("flex items-center justify-between px-2 py-2 text-sm rounded-md cursor-pointer hover:bg-muted transition-colors", isSelected && "bg-primary/10 text-primary font-medium")}
                      onClick={() => {
                        setActiveCats(prev => 
                          prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                        );
                      }}
                    >
                      <span className="truncate pr-4">{c.name}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          {hasDateFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearDates} 
              className="flex items-center space-x-1.5 text-muted-foreground hover:text-foreground h-9 animate-in fade-in slide-in-from-right-2 duration-200"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Dates</span>
            </Button>
          )}
          
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center space-x-2 h-9 bg-background">
                <Filter className="h-4 w-4" /><span>Date Filter</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-4" align="end">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm leading-none">Filter by Date</h4>
                <ModernSelect 
                  value={inputFilterType} 
                  onValueChange={(val) => setInputFilterType(val as "date" | "lastDateOfPayment")} 
                  options={[
                    {label: "Payment Date", value: "date"}, 
                    {label: "Due Date", value: "lastDateOfPayment"}
                  ]} 
                  placeholder="Select Date Type" 
                  className="h-7 w-[130px] text-xs" 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2 flex flex-col">
                  <Label className="text-xs mb-1">Start Date</Label>
                  <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9 px-2", !inputStart && "text-muted-foreground")}><CalendarIcon className="mr-2 h-3 w-3 shrink-0" /><span className="text-xs truncate">{inputStart ? format(inputStart, "PPP") : "Select date"}</span></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={inputStart} onSelect={(d) => { setInputStart(d); setIsStartOpen(false); }} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2 flex flex-col">
                  <Label className="text-xs mb-1">End Date</Label>
                  <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9 px-2", !inputEnd && "text-muted-foreground")}><CalendarIcon className="mr-2 h-3 w-3 shrink-0" /><span className="text-xs truncate">{inputEnd ? format(inputEnd, "PPP") : "Select date"}</span></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={inputEnd} onSelect={(d) => { setInputEnd(d); setIsEndOpen(false); }} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="space-y-2 pt-1 border-t mt-3">
                <Label className="text-xs mb-1">Quick Select (Month, Quarter & Year)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <ModernSelect
                    onValueChange={(val) => {
                      const monthIdx = parseInt(val);
                      const y = inputStart ? inputStart.getFullYear() : new Date().getFullYear();
                      setInputStart(new Date(y, monthIdx, 1));
                      setInputEnd(new Date(y, monthIdx + 1, 0));
                    }}
                    options={months.map((m, i) => ({ label: m, value: i.toString() }))}
                    placeholder="Month"
                    className="w-full h-9 text-xs"
                  />
                  <ModernSelect
                    onValueChange={(val) => {
                      const q = parseInt(val);
                      const y = inputStart ? inputStart.getFullYear() : new Date().getFullYear();
                      let mStart = 0, mEnd = 2;
                      if (q === 1) { mStart = 0; mEnd = 2; }
                      if (q === 2) { mStart = 3; mEnd = 5; }
                      if (q === 3) { mStart = 6; mEnd = 8; }
                      if (q === 4) { mStart = 9; mEnd = 11; }
                      setInputStart(new Date(y, mStart, 1));
                      setInputEnd(new Date(y, mEnd + 1, 0));
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
                      if (inputStart && inputEnd && inputStart.getMonth() === inputEnd.getMonth()) {
                        const monthIdx = inputStart.getMonth();
                        setInputStart(new Date(y, monthIdx, 1));
                        setInputEnd(new Date(y, monthIdx + 1, 0));
                      } else {
                        setInputStart(new Date(y, 0, 1));
                        setInputEnd(new Date(y, 11, 31));
                      }
                    }}
                    options={years.map(y => ({ label: y.toString(), value: y.toString() }))}
                    placeholder="Year"
                    className="w-full h-9 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="w-full text-xs" onClick={handleApplyDates}>Apply Filters</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-8">
          {groupedCategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">No categories or transactions found.</div>
          ) : (
            groupedCategories.map((group) => (
              <Card key={group.id} className="overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/30 border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{group.name}</CardTitle>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                      <EditCategoryDialog category={group} onUpdated={handleDataRefresh} />
                      <DeleteCategoryDialog 
                        category={group} 
                        onDeleted={() => { 
                          if(activeCats.includes(group.id)) setActiveCats(prev => prev.filter(id => id !== group.id)); 
                          handleDataRefresh(); 
                        }} 
                      />
                    </div>
                  </div>
                  <div className="text-right sm:text-left flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm font-medium">
                    <div className="text-muted-foreground">Allocated Budget: <span className="text-foreground">{formatINR(group.allocatedBudget)}</span></div>
                    <div className={group.remainingBudget < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>Remaining: {formatINR(group.remainingBudget)}</div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                        <TableHead className="w-[40px] text-center px-2">#</TableHead>
                        <TableHead className="px-2">Item Name</TableHead>
                        
                        <TableHead className="text-right px-2 select-none cursor-pointer group/th" onClick={() => handleSort("totalAmount")}>
                          <div className="flex items-center justify-end">
                            <span>Total Amount</span>
                            {renderSortIcon("totalAmount")}
                          </div>
                        </TableHead>
                        
                        <TableHead className="text-right px-2 select-none cursor-pointer group/th" onClick={() => handleSort("amountPaid")}>
                          <div className="flex items-center justify-end">
                            <span>Amount Paid</span>
                            {renderSortIcon("amountPaid")}
                          </div>
                        </TableHead>
                        
                        <TableHead className="text-right px-2 select-none cursor-pointer group/th" onClick={() => handleSort("pendingAmount")}>
                          <div className="flex items-center justify-end">
                            <span>Remaining</span>
                            {renderSortIcon("pendingAmount")}
                          </div>
                        </TableHead>
                        
                        <TableHead className="text-right px-2 select-none cursor-pointer group/th" onClick={() => handleSort("date")}>
                          <div className="flex items-center justify-end">
                            <span>Date of Payment</span>
                            {renderSortIcon("date")}
                          </div>
                        </TableHead>
                        
                        <TableHead className="text-right px-2 select-none cursor-pointer group/th" onClick={() => handleSort("lastDateOfPayment")}>
                          <div className="flex items-center justify-end">
                            <span>Last Date</span>
                            {renderSortIcon("lastDateOfPayment")}
                          </div>
                        </TableHead>
                        
                        <TableHead className="w-[40px] px-2"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.spends.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground italic px-2">No transactions.</TableCell></TableRow>
                      ) : (
                        group.spends.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-center text-muted-foreground px-2">{index + 1}</TableCell>
                            
                            <TableCell className="font-medium px-2">
                              <div className="flex items-center gap-2 group">
                                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 shrink-0">
                                  <EditItemNameDialog transactionId={item.id} currentName={item.itemName} onUpdated={handleDataRefresh} />
                                </div>
                                <span className="truncate">{item.itemName}</span>
                              </div>
                            </TableCell>
                            
                            <TableCell className="text-right px-2">
                              <div className="flex items-center justify-end gap-2 group">
                                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 shrink-0">
                                  <EditTotalAmountDialog transactionId={item.id} currentTotal={item.totalAmount} amountPaid={item.amountPaid} onUpdated={handleDataRefresh} />
                                </div>
                                <span>{formatINR(item.totalAmount)}</span>
                              </div>
                            </TableCell>
                            
                            <TableCell className="text-right px-2">
                              <div className="flex items-center justify-end gap-2 group">
                                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 shrink-0">
                                  <EditAmountDialog transactionId={item.id} currentAmountPaid={item.amountPaid} totalAmount={item.totalAmount} onUpdated={handleDataRefresh} />
                                </div>
                                <span>{formatINR(item.amountPaid)}</span>
                              </div>
                            </TableCell>
                            
                            <TableCell className={`text-right px-2 ${item.pendingAmount > 0 ? "text-destructive font-medium" : ""}`}>
                              {formatINR(item.pendingAmount)}
                            </TableCell>
                            
                            <TableCell className="text-right px-2">
                              <div className="flex items-center justify-end gap-2 group">
                                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 shrink-0">
                                  <EditPaymentDateDialog transactionId={item.id} currentDate={item.date} onUpdated={handleDataRefresh} />
                                </div>
                                <span className="text-muted-foreground">{item.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </TableCell>
                            
                            <TableCell className="text-right cursor-pointer px-2">
                              <div className="flex items-center justify-end gap-2 group">
                                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 shrink-0">
                                  <EditLastDateDialog transactionId={item.id} currentDate={item.lastDateOfPayment} paymentDate={item.date} onUpdated={handleDataRefresh} />
                                </div>
                                <span className={item.pendingAmount > 0 && item.lastDateOfPayment && item.lastDateOfPayment < new Date() ? "text-destructive font-medium" : "text-muted-foreground"}>
                                  {item.lastDateOfPayment ? item.lastDateOfPayment.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="italic">Not Set</span>}
                                </span>
                              </div>
                            </TableCell>
                            
                            <TableCell className="text-right px-2 pl-4">
                              <DeleteSpendItemDialog transactionId={item.id} itemName={item.itemName} onDeleted={handleDataRefresh} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}