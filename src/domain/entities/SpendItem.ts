export class SpendItem {
  constructor(
    public id: string,
    public categoryId: string,
    public itemName: string,
    public description: string | null,
    public totalAmount: number,
    public amountPaid: number,
    public date: Date,
    public billFileId?: string | null,
    public lastDateOfPayment?: Date | null // CRITICAL FIX: Added new property
  ) {}

  get pendingAmount(): number {
    return this.totalAmount - this.amountPaid;
  }
}