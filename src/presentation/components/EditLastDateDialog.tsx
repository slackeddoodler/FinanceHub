"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { UpdateLastDateUseCase } from "../../domain/use-cases/UpdateLastDateUseCase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Pencil, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function EditLastDateDialog({ transactionId, currentDate, onUpdated }: { transactionId: string, currentDate: Date | null, onUpdated: () => void }) {
  const { spendRepo } = useAppStore();
  const [open, setOpen] = useState(false);
  
  const [date, setDate] = useState<Date | undefined>(currentDate || undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSave = async () => {
    if (!spendRepo) return;

    let parsedDate: Date | null = null;
    if (date) {
      parsedDate = new Date(date);
      parsedDate.setHours(12, 0, 0, 0); 
    }

    const useCase = new UpdateLastDateUseCase(spendRepo);
    await useCase.execute(transactionId, parsedDate);
    
    setOpen(false);
    onUpdated(); 
  };

  const handleClear = async () => {
    if (!spendRepo) return;
    const useCase = new UpdateLastDateUseCase(spendRepo);
    await useCase.execute(transactionId, null);
    
    setDate(undefined);
    setOpen(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader>
          <DialogTitle>Edit Last Date of Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          
          <div className="space-y-2">
            <label className="text-xs font-medium block mb-2">Due Date</label>
            
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                {/* CRITICAL FIX: Removed obsolete initialFocus prop to comply with react-day-picker v9 */}
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate);
                    setIsCalendarOpen(false); 
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleSave} className="w-full">Update</Button>
            <Button variant="outline" onClick={handleClear} className="w-full">Clear Date</Button>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}