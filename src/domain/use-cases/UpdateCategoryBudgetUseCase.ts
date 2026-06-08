import { ICategoryRepository } from "../interfaces/repositories";

export class UpdateCategoryBudgetUseCase {
  constructor(private categoryRepo: ICategoryRepository) {}

  async execute(id: string, newBudget: number): Promise<void> {
    if (newBudget < 0) throw new Error("Budget cannot be negative.");
    await this.categoryRepo.updateBudget(id, newBudget);
  }
}