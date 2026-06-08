/**
 * Formats a raw number into INR (Indian Rupee) format.
 * Utilizes the en-IN locale for accurate comma placement (Lakhs, Crores).
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}