"use client";

import { useState } from "react";
import { useAppStore } from "../store/AppProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Pencil, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EditLastDateDialogProps {
  transactionId: string;
  currentDate: Date | null;
  paymentDate: Date; // Core transaction date used to enforce chronological logic
  onUpdated: () => void;
}

export function EditLastDateDialog({ transactionId, currentDate, paymentDate, onUpdated }: EditLastDateDialogProps) {
  const { spendRepo } = useAppStore();
  const [open, setOpen] = useState(false);
  
  const [date, setDate] = useState<Date | undefined>(currentDate || undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!spendRepo) return;
    setIsSaving(true);
    
    try {
      let parsedDate = null;
      
      // Allow users to clear the date by unselecting it in the calendar
      if (date) {
        parsedDate = new Date(date);
        parsedDate.setHours(12, 0, 0, 0);
      }

      await spendRepo.updateLastDateOfPayment(transactionId, parsedDate);
      setOpen(false);
      onUpdated();
    } catch (error) {
      console.error("Failed to update expected end date:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader><DialogTitle>Edit Expected End Date</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium block mb-2">Expected End Date</label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant={"outline"} 
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={date} 
                  onSelect={(newDate) => { 
                    setDate(newDate); 
                    // Only close the calendar if a date was actively selected (not unselected)
                    if (newDate) {
                      setIsCalendarOpen(false); 
                    }
                  }}
                  disabled={(calendarDate) => {
                    const boundary = new Date(paymentDate);
                    boundary.setHours(0, 0, 0, 0); 
                    return calendarDate < boundary;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={handleSave} className="w-full mt-4" disabled={isSaving}>Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}