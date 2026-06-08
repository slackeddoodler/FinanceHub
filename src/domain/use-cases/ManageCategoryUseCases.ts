import { ICategoryRepository, ISpendRepository } from "../interfaces/repositories";

export class UpdateCategoryNameUseCase {
  constructor(private categoryRepo: ICategoryRepository) {}
  async execute(categoryId: string, newName: string): Promise<void> {
    if (!newName.trim()) return;
    await this.categoryRepo.updateName(categoryId, newName.trim());
  }
}

export class DeleteCategoryUseCase {
  constructor(private categoryRepo: ICategoryRepository, private spendRepo: ISpendRepository) {}
  async execute(categoryId: string): Promise<void> {
    // Math logic: Ensure relational integrity by wiping associated spends first
    await this.spendRepo.deleteByCategoryId(categoryId);
    await this.categoryRepo.delete(categoryId);
  }
}