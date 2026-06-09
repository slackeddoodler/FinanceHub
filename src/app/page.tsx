"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardSkeleton } from "@/presentation/components/DashboardSkeleton";
import { LockScreen } from "@/presentation/components/LockScreen";
import { ThemeToggle } from "@/presentation/components/ThemeToggle";
import { AddSpendDialog } from "@/presentation/components/AddSpendDialog";
import { AddCategoryDialog } from "@/presentation/components/AddCategoryDialog";
import { EditAmountDialog } from "@/presentation/components/EditAmountDialog";
import { EditLastDateDialog } from "@/presentation/components/EditLastDateDialog";
import { EditCategoryDialog } from "@/presentation/components/EditCategoryDialog";
import { DeleteCategoryDialog } from "@/presentation/components/DeleteCategoryDialog";
import { EditItemNameDialog } from "@/presentation/components/EditItemNameDialog";
import { EditTotalAmountDialog } from "@/presentation/components/EditTotalAmountDialog";
import { EditPaymentDateDialog } from "@/presentation/components/EditPaymentDateDialog";
import { DeleteSpendItemDialog } from "@/presentation/components/DeleteSpendItemDialog";
import { ImportCSVDialog } from "@/presentation/components/ImportCSVDialog";
import { ExportCSVButton } from "@/presentation/components/ExportCSVButton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type SortableFields = "date" | "totalAmount" | "amountPaid" | "pendingAmount" | "lastDateOfPayment";

export default function LedgerPage() {
  const router = useRouter();
  const { isDbReady, isAuthenticated, spendRepo, categoryRepo, userRole, logoutUser } = useAppStore();
  
  const [data, setData] = useState<TransactionDTO[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [activeStart, setActiveStart] = useState<Date | undefined>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_date_filters");
      if (saved) { try { const p = JSON.parse(saved); if (p.startDate) return new Date(p.startDate); } catch(e){} }
    }
    return undefined;
  });

  const [activeEnd, setActiveEnd] = useState<Date | undefined>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_date_filters");
      if (saved) { try { const p = JSON.parse(saved); if (p.endDate) return new Date(p.endDate); } catch(e){} }
    }
    return undefined;
  });

  const [inputStart, setInputStart] = useState<Date | undefined>(activeStart);
  const [inputEnd, setInputEnd] = useState<Date | undefined>(activeEnd);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("financehub_date_filters", JSON.stringify({
        startDate: activeStart ? activeStart.toISOString() : null,
        endDate: activeEnd ? activeEnd.toISOString() : null
      }));
    }
  }, [activeStart, activeEnd]);

  useEffect(() => {
    if (isFilterOpen && typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_date_filters");
      if (saved) {
        try {
          const p = JSON.parse(saved);
          setInputStart(p.startDate ? new Date(p.startDate) : undefined);
          setInputEnd(p.endDate ? new Date(p.endDate) : undefined);
        } catch(e) {}
      } else {
        setInputStart(undefined); setInputEnd(undefined);
      }
    }
  }, [isFilterOpen]);
  
  const [activeCats, setActiveCats] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("financehub_active_cats");
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
      sessionStorage.setItem("financehub_active_cats", JSON.stringify(activeCats));
    }
  }, [activeCats]);

  const handleDataRefresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    if (!isDbReady || !isAuthenticated || !spendRepo || !categoryRepo) return;
    
    // CRITICAL FIX: Intercept the fetched categories and hardcode alphabetical sorting
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
      let matchesStart = !activeStart || item.date >= activeStart;
      let matchesEnd = true;
      if (activeEnd) {
        const e = new Date(activeEnd);
        e.setHours(23, 59, 59, 999);
        matchesEnd = item.date <= e;
      }
      return matchesCat && matchesStart && matchesEnd;
    });
  }, [data, activeCats, activeStart, activeEnd]);

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
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
            <p className="text-sm text-muted-foreground mt-1">Categorized transaction tracker.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>View Dashboard</Button>
          <Button variant="secondary" onClick={() => router.push('/budgets')}>Manage Budgets</Button>
          <div className="flex items-center space-x-2">
            <ImportCSVDialog onImported={handleDataRefresh} />
            <ExportCSVButton />
          </div>
          <div className="flex items-center space-x-2 border-l pl-4 ml-2">
            <AddSpendDialog onSpendAdded={handleDataRefresh} />
            {userRole === "admin" && <AddCategoryDialog onCategoryAdded={handleDataRefresh} />}
            <ThemeToggle />
            <Button variant="ghost" className="text-destructive h-9 px-3" onClick={logoutUser}>Logout</Button>
          </div>
        </div>
      </header>

      <div className="space-y-2">
        <div className="flex justify-end items-center gap-2 pt-2 pb-4">
          
          {/* CRITICAL UX FEATURE: The Modern Category Dropdown Menu */}
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
              <h4 className="font-semibold text-sm leading-none">Filter by Date</h4>
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
                  <Select onValueChange={(val) => {
                    const monthIdx = parseInt(val);
                    const y = inputStart ? inputStart.getFullYear() : new Date().getFullYear();
                    setInputStart(new Date(y, monthIdx, 1));
                    setInputEnd(new Date(y, monthIdx + 1, 0));
                  }}>
                    <SelectTrigger className="w-full h-9 text-xs px-2"><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectGroup>
                        {months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select onValueChange={(val) => {
                    const q = parseInt(val);
                    const y = inputStart ? inputStart.getFullYear() : new Date().getFullYear();
                    let mStart = 0, mEnd = 2;
                    if (q === 1) { mStart = 0; mEnd = 2; }
                    if (q === 2) { mStart = 3; mEnd = 5; }
                    if (q === 3) { mStart = 6; mEnd = 8; }
                    if (q === 4) { mStart = 9; mEnd = 11; }
                    setInputStart(new Date(y, mStart, 1));
                    setInputEnd(new Date(y, mEnd + 1, 0));
                  }}>
                    <SelectTrigger className="w-full h-9 text-xs px-2"><SelectValue placeholder="Qtr" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectGroup>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select onValueChange={(val) => {
                    const y = parseInt(val);
                    if (inputStart && inputEnd && inputStart.getMonth() === inputEnd.getMonth()) {
                      const monthIdx = inputStart.getMonth();
                      setInputStart(new Date(y, monthIdx, 1));
                      setInputEnd(new Date(y, monthIdx + 1, 0));
                    } else {
                      setInputStart(new Date(y, 0, 1));
                      setInputEnd(new Date(y, 11, 31));
                    }
                  }}>
                    <SelectTrigger className="w-full h-9 text-xs px-2"><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectGroup>
                        {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
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
                {/* CRITICAL UX FEATURE: 'group' class added to track hover state across the entire header */}
                <CardHeader className="bg-muted/30 border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{group.name}</CardTitle>
                    {/* CRITICAL UX FEATURE: Edit/Delete buttons dynamically appear on hover */}
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
                          <TableRow key={item.id} className="group/row">
                            <TableCell className="text-center text-muted-foreground px-2">{index + 1}</TableCell>
                            <TableCell className="font-medium px-2">
                              <div className="flex items-center gap-2">
                                <EditItemNameDialog transactionId={item.id} currentName={item.itemName} onUpdated={handleDataRefresh} />
                                <span className="truncate">{item.itemName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-2">
                              <div className="flex items-center justify-end gap-2">
                                <EditTotalAmountDialog transactionId={item.id} currentTotal={item.totalAmount} amountPaid={item.amountPaid} onUpdated={handleDataRefresh} />
                                <span>{formatINR(item.totalAmount)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-2">
                              <div className="flex items-center justify-end gap-2">
                                <EditAmountDialog transactionId={item.id} currentAmountPaid={item.amountPaid} totalAmount={item.totalAmount} onUpdated={handleDataRefresh} />
                                <span>{formatINR(item.amountPaid)}</span>
                              </div>
                            </TableCell>
                            <TableCell className={`text-right px-2 ${item.pendingAmount > 0 ? "text-destructive font-medium" : ""}`}>{formatINR(item.pendingAmount)}</TableCell>
                            <TableCell className="text-right px-2">
                              <div className="flex items-center justify-end gap-2">
                                <EditPaymentDateDialog transactionId={item.id} currentDate={item.date} onUpdated={handleDataRefresh} />
                                <span className="text-muted-foreground">{item.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right cursor-pointer px-2">
                              <div className="flex items-center justify-end gap-2">
                                <EditLastDateDialog transactionId={item.id} currentDate={item.lastDateOfPayment} onUpdated={handleDataRefresh} />
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