"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/presentation/store/AppProvider";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { ImportCSVDialog } from "./ImportCSVDialog";
import { ExportCSVButton } from "./ExportCSVButton";
import { AddSpendDialog } from "./AddSpendDialog";
import { AddCategoryDialog } from "./AddCategoryDialog";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Database, ChevronDown, Save, UploadCloud, FileText } from "lucide-react";
import { backupDatabase, exportDashboardToPDF } from "@/presentation/lib/exportUtils";
import { cn } from "@/lib/utils";

// --- THE UNIFIED DATA MANAGEMENT COMPONENT ---
function DataManagementDropdown({ activePage, onImported }: { activePage: string, onImported: () => void }) {
  const [open, setOpen] = useState(false);
  
  // Strips button styling from Dialog components to match native Select items
  const overrideClasses = "[&_button]:w-full [&_button]:flex [&_button]:items-center [&_button]:justify-start [&_button]:px-2 [&_button]:py-1.5 [&_button]:text-sm [&_button]:rounded-sm [&_button]:cursor-pointer [&_button]:hover:bg-muted [&_button]:transition-colors [&_button]:!bg-transparent [&_button]:!border-0 [&_button]:!shadow-none [&_button]:font-normal [&_button]:!h-auto [&_button]:text-foreground [&_button]:!space-x-0 [&_button]:gap-2 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:opacity-70 [&_span]:truncate";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[160px] justify-between font-normal px-2 h-10 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Database className="h-4 w-4 opacity-50 shrink-0" />
            <span className="truncate text-sm">Manage Data</span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50 ml-1 shrink-0" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="p-1 shadow-lg" style={{ width: 'var(--radix-popover-trigger-width)' }} align="start">
        <div className="flex flex-col gap-0.5">
          
          <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
            Spreadsheet
          </div>
          
          <div className={cn("flex flex-col gap-0.5", overrideClasses)}>
            <ImportCSVDialog onImported={() => { onImported(); setOpen(false); }} />
            <ExportCSVButton />
          </div>

          <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 border-t mt-1 pt-2">
            Database
          </div>
          
          <div className="flex flex-col gap-0.5">
            <div 
              onClick={() => { backupDatabase(); setOpen(false); }}
              className="flex items-center justify-start px-2 py-1.5 text-sm font-normal rounded-sm cursor-pointer hover:bg-muted transition-colors"
            >
              <Save className="h-4 w-4 mr-2 opacity-70" />
              <span className="truncate">Backup DB</span>
            </div>
            <div 
              onClick={() => { console.warn("Restore Logic execution triggered."); setOpen(false); }}
              className="flex items-center justify-start px-2 py-1.5 text-sm font-normal rounded-sm cursor-pointer hover:bg-muted transition-colors"
            >
              <UploadCloud className="h-4 w-4 mr-2 opacity-70" />
              <span className="truncate">Restore DB</span>
            </div>
          </div>

          {activePage === "dashboard" && (
            <>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 border-t mt-1 pt-2">
                Reports
              </div>
              <div 
                onClick={() => { exportDashboardToPDF("dashboard-report-area"); setOpen(false); }}
                className="flex items-center justify-start px-2 py-1.5 text-sm font-normal rounded-sm cursor-pointer hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4 mr-2 opacity-70 text-indigo-500" />
                <span className="truncate">Export PDF</span>
              </div>
            </>
          )}

        </div>
      </PopoverContent>
    </Popover>
  );
}

// --- MAIN GLOBAL HEADER ---
interface GlobalHeaderProps {
  title: string;
  subtitle: string;
  activePage: "ledger" | "dashboard" | "budgets" | "team";
  handleDataRefresh: () => void;
}

export function GlobalHeader({ title, subtitle, activePage, handleDataRefresh }: GlobalHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Extract userRole from our RBAC-enabled store
  const { logoutUser, userRole } = useAppStore();
  
  const isPersonal = pathname?.startsWith("/personal");

  // --- RBAC PERMISSION CHECKS ---
  // Personal workspace is always editable. Company workspace requires Editor or Admin role.
  const canEdit = isPersonal || userRole === "admin" || userRole === "editor";
  // Only Admins looking at the Company Workspace can see the Team tab.
  const isAdmin = !isPersonal && userRole === "admin";

  const navTo = (page: string) => {
    const base = isPersonal ? "/personal" : "";
    if (page === "ledger") router.push(base || "/");
    if (page === "dashboard") router.push(`${base}/dashboard`);
    if (page === "budgets") router.push(`${base}/budgets`);
    if (page === "team") router.push(`/team`);
  };

  return (
    <header className="flex flex-row items-center justify-between w-full pb-4 border-b flex-nowrap gap-4 overflow-hidden">
      
      {/* Left Section (Truncates if screen gets extremely narrow) */}
      <div className="flex flex-row items-center gap-4 shrink min-w-0 flex-nowrap">
        <WorkspaceSwitcher />
        <div className="hidden lg:block w-px h-6 bg-border shrink-0" /> 
        <div className="flex flex-col min-w-0 shrink hidden md:flex">
          <h1 className={cn("text-xl xl:text-2xl font-bold tracking-tight truncate", isPersonal ? "text-emerald-600 dark:text-emerald-400" : "")}>
            {title}
          </h1>
          <p className="text-sm text-muted-foreground truncate hidden xl:block">{subtitle}</p>
        </div>
      </div>
      
      {/* Right Section (Locked width via shrink-0) */}
      <div className="flex flex-row items-center gap-2 shrink-0 flex-nowrap">
        
        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-muted/50 p-1 rounded-lg shrink-0">
          <Button variant={activePage === "ledger" ? "secondary" : "ghost"} size="sm" className="h-8 md:h-10 px-2 md:px-3 whitespace-nowrap" onClick={() => navTo("ledger")}>Ledger</Button>
          <Button variant={activePage === "dashboard" ? "secondary" : "ghost"} size="sm" className="h-8 md:h-10 px-2 md:px-3 whitespace-nowrap" onClick={() => navTo("dashboard")}>Dashboard</Button>
          <Button variant={activePage === "budgets" ? "secondary" : "ghost"} size="sm" className="h-8 md:h-10 px-2 md:px-3 whitespace-nowrap" onClick={() => navTo("budgets")}>Budgets</Button>
          
          {/* RBAC: Conditional Team Management Tab */}
          {isAdmin && (
            <Button 
              variant={activePage === "team" ? "secondary" : "ghost"} 
              size="sm" 
              className={cn("h-8 md:h-10 px-2 md:px-3 whitespace-nowrap", activePage !== "team" && "text-indigo-600 dark:text-indigo-400")} 
              onClick={() => navTo("team")}
            >
              Team
            </Button>
          )}
        </nav>
        
        {/* RBAC: Conditional Write Actions (Hidden for Viewers) */}
        {canEdit && (
          <>
            <div className="hidden sm:block w-px h-6 bg-border mx-1 shrink-0" />
            <DataManagementDropdown activePage={activePage} onImported={handleDataRefresh} />
            <div className="hidden sm:block w-px h-6 bg-border mx-1 shrink-0" />
            <div className="flex flex-row items-center gap-2 shrink-0 flex-nowrap [&_button]:h-10 [&_button]:whitespace-nowrap">
              <AddSpendDialog onSpendAdded={handleDataRefresh} />
              <AddCategoryDialog onCategoryAdded={handleDataRefresh} />
            </div>
          </>
        )}

        {/* Global Read-Only Actions (Always visible) */}
        <div className="flex flex-row items-center gap-2 shrink-0 flex-nowrap pl-1">
          <ThemeToggle />
          <Button variant="ghost" className="text-destructive h-10 px-3 shrink-0 whitespace-nowrap" onClick={logoutUser}>Logout</Button>
        </div>
        
      </div>
    </header>
  );
}