import { ICategoryRepository, ISpendRepository } from "../interfaces/repositories";

export interface TransactionDTO {
  id: string;
  categoryId: string;
  categoryName: string;
  itemName: string;
  totalAmount: number;
  amountPaid: number;
  pendingAmount: number;
  date: Date;
  lastDateOfPayment: Date | null;
  transactionId: string | null;
}

export class GetTransactionsUseCase {
  constructor(private categoryRepo: ICategoryRepository, private spendRepo: ISpendRepository) {}

  async execute(): Promise<TransactionDTO[]> {
    const categories = await this.categoryRepo.findAll();
    const spends = await this.spendRepo.findByDateRange(new Date("2000-01-01"), new Date("2100-01-01"));
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => categoryMap.set(cat.id, cat.name));

    return spends.map(s => ({
      id: s.id,
      categoryId: s.categoryId,
      categoryName: categoryMap.get(s.categoryId) || "Unknown Category",
      itemName: s.itemName,
      totalAmount: s.totalAmount,
      amountPaid: s.amountPaid,
      pendingAmount: s.pendingAmount,
      date: s.date,
      lastDateOfPayment: s.lastDateOfPayment || null,
      transactionId: s.transactionId || null
    }));
  }
}