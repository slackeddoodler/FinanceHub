import { ISpendRepository } from "../interfaces/repositories";

export class UpdateItemNameUseCase {
  constructor(private spendRepo: ISpendRepository) {}
  async execute(id: string, name: string): Promise<void> {
    if (!name.trim()) return;
    await this.spendRepo.updateItemName(id, name.trim());
  }
}

export class UpdateTotalAmountUseCase {
  constructor(private spendRepo: ISpendRepository) {}
  async execute(id: string, amount: number): Promise<void> {
    if (amount < 0 || isNaN(amount)) return;
    await this.spendRepo.updateTotalAmount(id, amount);
  }
}

export class UpdatePaymentDateUseCase {
  constructor(private spendRepo: ISpendRepository) {}
  async execute(id: string, date: Date): Promise<void> {
    await this.spendRepo.updatePaymentDate(id, date);
  }
}

export class DeleteSpendItemUseCase {
  constructor(private spendRepo: ISpendRepository) {}
  async execute(id: string): Promise<void> {
    await this.spendRepo.delete(id);
  }
}