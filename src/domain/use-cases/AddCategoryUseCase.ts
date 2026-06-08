import { Category } from "../entities/Category";
import { ICategoryRepository } from "../interfaces/repositories";

export class AddCategoryUseCase {
  constructor(private categoryRepo: ICategoryRepository) {}

  async execute(name: string, allocatedBudget: number): Promise<Category> {
    // crypto.randomUUID() is natively supported in all modern browsers
    const id = crypto.randomUUID(); 
    const category = new Category(id, name, allocatedBudget, new Date());
    
    await this.categoryRepo.save(category);
    return category;
  }
}