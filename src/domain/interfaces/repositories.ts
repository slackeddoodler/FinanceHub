import { Category } from "../entities/Category";
import { SpendItem } from "../entities/SpendItem";

export interface ICategoryRepository {
  save(category: Category): Promise<void>;
  findAll(): Promise<Category[]>;
  updateName(id: string, newName: string): Promise<void>;
  
  // CRITICAL FIX: Contract for updating the allocated budget
  updateBudget(id: string, newBudget: number): Promise<void>;
  
  delete(id: string): Promise<void>;
}

export interface ISpendRepository {
  save(item: SpendItem): Promise<void>;
  findByDateRange(start: Date, end: Date): Promise<SpendItem[]>;
  updateAmountPaid(id: string, amountPaid: number): Promise<void>;
  updateLastDateOfPayment(id: string, lastDate: Date | null): Promise<void>;
  updateItemName(id: string, name: string): Promise<void>;
  updateTotalAmount(id: string, amount: number): Promise<void>;
  updatePaymentDate(id: string, date: Date): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByCategoryId(categoryId: string): Promise<void>;
}