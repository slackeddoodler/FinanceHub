export class Category {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly allocatedBudget: number,
    public readonly createdAt: Date
  ) {
    if (this.allocatedBudget < 0) {
      throw new Error("Budget cannot be negative.");
    }
    if (this.name.trim() === "") {
      throw new Error("Category name cannot be empty.");
    }
  }
}