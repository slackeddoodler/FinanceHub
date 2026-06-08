"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { UpdatePaymentDateUseCase } from "../../domain/use-cases/ManageSpendUseCases";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Pencil, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function EditPaymentDateDialog({ transactionId, currentDate, onUpdated }: { transactionId: string, currentDate: Date, onUpdated: () => void }) {
  const { spendRepo } = useAppStore();
  const [open, setOpen] = useState(false);
  
  const [date, setDate] = useState<Date | undefined>(currentDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSave = async () => {
    if (!spendRepo || !date) return;

    const parsedDate = new Date(date);
    parsedDate.setHours(12, 0, 0, 0); 

    const useCase = new UpdatePaymentDateUseCase(spendRepo);
    await useCase.execute(transactionId, parsedDate);
    
    setOpen(false);
    onUpdated(); 
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader><DialogTitle>Edit Payment Date</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium block mb-2">Payment Date</label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(newDate) => { if(newDate){ setDate(newDate); setIsCalendarOpen(false); } }} />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={handleSave} className="w-full mt-4" disabled={!date}>Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}