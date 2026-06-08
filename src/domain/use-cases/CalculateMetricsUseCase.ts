import { ICategoryRepository, ISpendRepository } from "../interfaces/repositories";

// Define the universal filter contract
export interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string | "ALL";
}

export class CalculateMetricsUseCase {
  constructor(
    private categoryRepo: ICategoryRepository,
    private spendRepo: ISpendRepository
  ) {}

  async execute(filters?: DashboardFilters) {
    let categories = await this.categoryRepo.findAll();

    // Default to a massive range if no dates are provided
    const start = filters?.startDate || new Date("2000-01-01");
    const end = filters?.endDate || new Date("2100-01-01");
    
    // Mathematically guarantee we include the entire end day until 11:59:59 PM
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    let spends = await this.spendRepo.findByDateRange(start, endOfDay);

    // Apply the Category Filter if an admin selects one
    if (filters?.categoryId && filters.categoryId !== "ALL") {
      categories = categories.filter(c => c.id === filters.categoryId);
      spends = spends.filter(s => s.categoryId === filters.categoryId);
    }

    const totalBudget = categories.reduce((sum, cat) => sum + cat.allocatedBudget, 0);
    const totalSpent = spends.reduce((sum, spend) => sum + spend.totalAmount, 0);
    const totalPending = spends.reduce((sum, spend) => sum + spend.pendingAmount, 0);

    const categoryChartData = categories.map(cat => {
      const catSpends = spends.filter(s => s.categoryId === cat.id);
      const spentInCat = catSpends.reduce((sum, s) => sum + s.totalAmount, 0);
      return {
        name: cat.name,
        budget: cat.allocatedBudget,
        spent: spentInCat,
        isWarning: spentInCat > (cat.allocatedBudget * 0.9) 
      };
    });

    return { totalBudget, totalSpent, totalPending, categoryChartData };
  }
}