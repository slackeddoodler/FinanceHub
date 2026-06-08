import { ICategoryRepository, ISpendRepository } from "../interfaces/repositories";
import { sendBudgetAlertEmail } from "../../app/actions/emailActions";

export class CheckBudgetAndNotifyUseCase {
  constructor(
    private categoryRepo: ICategoryRepository, 
    private spendRepo: ISpendRepository
  ) {}

  async execute(categoryId: string): Promise<void> {
    try {
      // 1. Validate Category constraints
      const categories = await this.categoryRepo.findAll();
      const category = categories.find(c => c.id === categoryId);
      if (!category || category.allocatedBudget <= 0) return;

      // 2. Mathematically aggregate total expenditures
      const allSpends = await this.spendRepo.findByDateRange(new Date("2000-01-01"), new Date("2100-01-01"));
      const catSpends = allSpends.filter(s => s.categoryId === categoryId);
      const totalSpent = catSpends.reduce((sum, item) => sum + item.totalAmount, 0);

      // 3. Evaluate Threshold Constraints (20% remaining = 80% spent, 10% remaining = 90% spent)
      const percentage = (totalSpent / category.allocatedBudget) * 100;
      let alertToSend: "exceeded" | "warning_90" | "warning_80" | null = null;

      // Evaluate top-down to find the most critical threshold that hasn't been notified yet
      if (typeof window !== "undefined") {
        if (percentage >= 100 && !localStorage.getItem(`financehub_alert_${categoryId}_exceeded`)) {
          alertToSend = "exceeded";
        } else if (percentage >= 90 && percentage < 100 && !localStorage.getItem(`financehub_alert_${categoryId}_warning_90`)) {
          alertToSend = "warning_90";
        } else if (percentage >= 80 && percentage < 90 && !localStorage.getItem(`financehub_alert_${categoryId}_warning_80`)) {
          alertToSend = "warning_80";
        }
      }

      if (!alertToSend) return;

      // 4. Dispatch the Server Action
      const res = await sendBudgetAlertEmail(category.name, category.allocatedBudget, totalSpent, alertToSend);
      
      if (res.success && typeof window !== "undefined") {
        // 5. Anti-Spam Cascade Logic: Successfully sending a high-tier alert mathematically locks out lower tiers
        // preventing retroactive spamming if the user jumps boundaries quickly.
        if (alertToSend === "exceeded") {
          localStorage.setItem(`financehub_alert_${categoryId}_exceeded`, "true");
          localStorage.setItem(`financehub_alert_${categoryId}_warning_90`, "true");
          localStorage.setItem(`financehub_alert_${categoryId}_warning_80`, "true");
        } else if (alertToSend === "warning_90") {
          localStorage.setItem(`financehub_alert_${categoryId}_warning_90`, "true");
          localStorage.setItem(`financehub_alert_${categoryId}_warning_80`, "true");
        } else if (alertToSend === "warning_80") {
          localStorage.setItem(`financehub_alert_${categoryId}_warning_80`, "true");
        }
      }

    } catch (error) {
      console.error("Failed to execute budget check sequence:", error);
    }
  }
}