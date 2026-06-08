import { ISpendRepository } from "../interfaces/repositories";

export class UpdateLastDateUseCase {
  constructor(private spendRepo: ISpendRepository) {}

  async execute(transactionId: string, lastDate: Date | null): Promise<void> {
    await this.spendRepo.updateLastDateOfPayment(transactionId, lastDate);
  }
}