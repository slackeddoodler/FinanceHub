import { ISpendRepository } from "../interfaces/repositories";

export class UpdateAmountPaidUseCase {
  constructor(private spendRepo: ISpendRepository) {}

  async execute(transactionId: string, newAmountPaid: number): Promise<void> {
    await this.spendRepo.updateAmountPaid(transactionId, newAmountPaid);
  }
}