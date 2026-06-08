import { SpendItem } from "../entities/SpendItem";
import { ISpendRepository } from "../interfaces/repositories";

export class AddSpendItemUseCase {
  constructor(private spendRepo: ISpendRepository) {}

  async execute(
    categoryId: string,
    itemName: string,
    description: string | null,
    totalAmount: number,
    amountPaid: number,
    date: Date
  ): Promise<SpendItem> {
    const id = crypto.randomUUID();
    
    // The entity's constructor will automatically validate the math (Amount Paid <= Total Amount)
    const spendItem = new SpendItem(
      id,
      categoryId,
      itemName,
      description,
      totalAmount,
      amountPaid,
      date
    );
    
    await this.spendRepo.save(spendItem);
    return spendItem;
  }
}