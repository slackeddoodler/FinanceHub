"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isPersonal = pathname?.startsWith("/personal");
  const activeWorkspace = isPersonal ? "personal" : "company";

  const handleSwitch = (target: "company" | "personal") => {
    setOpen(false);
    if (target === activeWorkspace) return;

    let basePath = pathname || "/";
    if (isPersonal) {
      basePath = pathname.replace(/^\/personal/, "") || "/";
    }

    const newPath = target === "personal" 
      ? `/personal${basePath === "/" ? "" : basePath}` 
      : basePath;

    router.push(newPath);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* PIXEL-PERFECT MATCH: Mimicking ModernSelect from AddSpendDialog exactly */}
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between font-normal px-2 h-10 shrink-0"
        >
          <div className="flex items-center gap-2 truncate">
            {activeWorkspace === "company" ? (
              <Building2 className="h-4 w-4 opacity-50 shrink-0" />
            ) : (
              <User className="h-4 w-4 opacity-50 shrink-0" />
            )}
            <span className="truncate text-sm">
              {activeWorkspace === "company" ? "Company Workspace" : "Personal Workspace"}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50 ml-1 shrink-0" />
        </Button>
      </PopoverTrigger>
      
      {/* FLUSH ALIGNMENT: Forces exact width matching of the trigger box */}
      <PopoverContent className="p-1 shadow-lg" style={{ width: 'var(--radix-popover-trigger-width)' }} align="start">
        <div className="flex flex-col gap-0.5">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Workspaces
          </div>
          
          <div
            onClick={() => handleSwitch("company")}
            className={cn(
              "flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer transition-colors hover:bg-muted",
              activeWorkspace === "company" && "bg-primary/10 text-primary font-medium hover:bg-primary/10"
            )}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate pr-4">Company Workspace</span>
            </div>
            {activeWorkspace === "company" && <Check className="h-4 w-4 shrink-0" />}
          </div>
          
          <div
            onClick={() => handleSwitch("personal")}
            className={cn(
              "flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors hover:bg-muted",
              activeWorkspace === "personal" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            )}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate pr-4">Personal Workspace</span>
            </div>
            {activeWorkspace === "personal" && <Check className="h-4 w-4 shrink-0" />}
          </div>
          
        </div>
      </PopoverContent>
    </Popover>
  );
}