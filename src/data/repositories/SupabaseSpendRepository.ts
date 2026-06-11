import { ISpendRepository } from "../../domain/interfaces/repositories";
import { SpendItem } from "../../domain/entities/SpendItem";
import { supabase } from "../database/supabase";

export class SupabaseSpendRepository implements ISpendRepository {
  constructor(private isPersonal: boolean = false, private userId: string | null = null) {}

  async save(item: SpendItem): Promise<void> {
    if (this.isPersonal && !this.userId) {
      throw new Error("Critical Error: Missing User UUID for Personal Spend creation.");
    }

    const payload: any = {
      id: item.id,
      category_id: item.categoryId,
      item_name: item.itemName,
      description: item.description,
      total_amount: item.totalAmount,
      amount_paid: item.amountPaid,
      date: item.date.toISOString(),
      bill_file_id: item.billFileId || null,
      last_date_of_payment: item.lastDateOfPayment ? item.lastDateOfPayment.toISOString() : null,
      transaction_id: item.transactionId || null,
      user_id: this.isPersonal ? this.userId : null
    };
    
    const { error } = await supabase.from('spends').upsert(payload);
    if (error) throw new Error(error.message);
  }

  async findByDateRange(start: Date, end: Date): Promise<SpendItem[]> {
    let query = supabase.from('spends').select('*')
      .gte('date', start.toISOString())
      .lte('date', end.toISOString());

    // Strict Database-Level Partitioning
    if (this.isPersonal) {
      if (!this.userId) return []; // Fail-safe
      query = query.eq('user_id', this.userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    if (!data) return [];

    return data.map((row: any) => {
      return new SpendItem(
        String(row.id),
        String(row.category_id),
        String(row.item_name),
        row.description ? String(row.description) : null,
        Number(row.total_amount),
        Number(row.amount_paid),
        new Date(row.date),
        row.bill_file_id ? String(row.bill_file_id) : null,
        row.last_date_of_payment ? new Date(row.last_date_of_payment) : null,
        row.transaction_id ? String(row.transaction_id) : null
      );
    });
  }

  async updateAmountPaid(id: string, amountPaid: number): Promise<void> {
    let query = supabase.from('spends').update({ amount_paid: amountPaid } as any).eq('id', id);
    query = this.isPersonal ? query.eq('user_id', this.userId) : query.is('user_id', null);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  async updateLastDateOfPayment(id: string, lastDate: Date | null): Promise<void> {
    let query = supabase.from('spends').update({ 
      last_date_of_payment: lastDate ? lastDate.toISOString() : null 
    } as any).eq('id', id);
    query = this.isPersonal ? query.eq('user_id', this.userId) : query.is('user_id', null);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  async updateItemName(id: string, name: string): Promise<void> {
    let query = supabase.from('spends').update({ item_name: name } as any).eq('id', id);
    query = this.isPersonal ? query.eq('user_id', this.userId) : query.is('user_id', null);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  async updateTotalAmount(id: string, amount: number): Promise<void> {
    let query = supabase.from('spends').update({ total_amount: amount } as any).eq('id', id);
    query = this.isPersonal ? query.eq('user_id', this.userId) : query.is('user_id', null);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  async updatePaymentDate(id: string, date: Date): Promise<void> {
    let query = supabase.from('spends').update({ date: date.toISOString() } as any).eq('id', id);
    query = this.isPersonal ? query.eq('user_id', this.userId) : query.is('user_id', null);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    let query = supabase.from('spends').delete().eq('id', id);
    query = this.isPersonal ? query.eq('user_id', this.userId) : query.is('user_id', null);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  async deleteByCategoryId(categoryId: string): Promise<void> {
    let query = supabase.from('spends').delete().eq('category_id', categoryId);
    query = this.isPersonal ? query.eq('user_id', this.userId) : query.is('user_id', null);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }
}