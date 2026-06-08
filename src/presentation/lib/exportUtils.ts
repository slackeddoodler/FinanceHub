import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { Category } from "../../domain/entities/Category";
import { SpendItem } from "../../domain/entities/SpendItem";

export function exportToCSV(categories: Category[], spends: SpendItem[]) {
  // CRITICAL FIX: Pure transaction data matching the Ledger UI column flow exactly
  let csv = "Category,Item Name,Total Amount,Amount Paid,Remaining Amount,Date of Payment,Due Date\n";

  const sortedSpends = [...spends].sort((a, b) => b.date.getTime() - a.date.getTime());

  sortedSpends.forEach(s => {
    const cat = categories.find(c => c.id === s.categoryId);
    const catName = cat ? `"${cat.name.replace(/"/g, '""')}"` : `"Uncategorized"`;
    const safeItemName = `"${s.itemName.replace(/"/g, '""')}"`;
    
    const dateStr = s.date.toLocaleDateString('en-IN');
    const dueDateStr = s.lastDateOfPayment ? s.lastDateOfPayment.toLocaleDateString('en-IN') : "Not Set";
    const pending = s.totalAmount - s.amountPaid;

    csv += `${catName},${safeItemName},${s.totalAmount},${s.amountPaid},${pending},${dateStr},${dueDateStr}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `FinanceHub_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportDashboardToPDF(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const originalOverflow = element.style.overflow;
  element.style.overflow = 'visible';

  const style = document.createElement('style');
  style.innerHTML = `
    *::-webkit-scrollbar { display: none !important; }
    * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
  `;
  document.head.appendChild(style);

  try {
    const imgData = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF({
      orientation: element.offsetWidth > element.offsetHeight ? "landscape" : "portrait",
      unit: "px",
      format: [element.offsetWidth, element.offsetHeight]
    });

    pdf.addImage(imgData, "PNG", 0, 0, element.offsetWidth, element.offsetHeight);
    pdf.save(`FinanceHub_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
    
  } catch (error) {
    console.error("PDF Export Engine Failed:", error);
  } finally {
    element.style.overflow = originalOverflow;
    document.head.removeChild(style);
  }
}

export function backupDatabase() {
  console.warn("Backup logic to be implemented via direct IndexedDB extraction.");
}