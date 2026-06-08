import { ISpendRepository } from "../interfaces/repositories";
import { DashboardFilters } from "./CalculateMetricsUseCase";

export type TimeFrame = "daily" | "weekly" | "monthly";

export class CalculateSpendTrendUseCase {
  constructor(private spendRepo: ISpendRepository) {}

  async execute(timeframe: TimeFrame, filters?: DashboardFilters) {
    const start = filters?.startDate || new Date("2000-01-01");
    const end = filters?.endDate || new Date("2100-01-01");
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    let spends = await this.spendRepo.findByDateRange(start, endOfDay);

    if (filters?.categoryId && filters.categoryId !== "ALL") {
      spends = spends.filter(s => s.categoryId === filters.categoryId);
    }

    spends.sort((a, b) => a.date.getTime() - b.date.getTime());

    const groupedData = new Map<string, number>();

    for (const spend of spends) {
      const d = spend.date;
      let key = "";

      if (timeframe === "daily") {
        key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } else if (timeframe === "monthly") {
        key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      } else if (timeframe === "weekly") {
        const startOfWeek = new Date(d);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        key = `Week of ${startOfWeek.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
      }

      const currentAmount = groupedData.get(key) || 0;
      groupedData.set(key, currentAmount + spend.totalAmount);
    }

    return Array.from(groupedData.entries()).map(([timeLabel, amount]) => ({
      timeLabel,
      amount
    }));
  }
}