import { ISpendRepository } from "../../domain/interfaces/repositories";
import { SpendItem } from "../../domain/entities/SpendItem";
import { supabase } from "../database/supabase";

export class SupabaseSpendRepository implements ISpendRepository {
  async save(item: SpendItem): Promise<void> {
    const payload: any = {
      id: item.id,
      category_id: item.categoryId,
      item_name: item.itemName,
      description: item.description, // Mapped to match Domain Entity
      total_amount: item.totalAmount,
      amount_paid: item.amountPaid,
      date: item.date.toISOString(),
      bill_file_id: item.billFileId || null, // Mapped to match Domain Entity
      last_date_of_payment: item.lastDateOfPayment ? item.lastDateOfPayment.toISOString() : null,
    };
    
    const { error } = await supabase.from('spends').upsert(payload);
    if (error) throw new Error(error.message);
  }

  async findByDateRange(start: Date, end: Date): Promise<SpendItem[]> {
    const { data, error } = await supabase
      .from('spends')
      .select('*')
      .gte('date', start.toISOString())
      .lte('date', end.toISOString());

    if (error) throw new Error(error.message);
    if (!data) return [];

    return data.map((row: any) => {
      // EXACT Constructor Mapping to clear TypeScript errors permanently
      return new SpendItem(
        String(row.id),                                      // 1. id
        String(row.category_id),                             // 2. categoryId
        String(row.item_name),                               // 3. itemName
        row.description ? String(row.description) : null,    // 4. description (string | null)
        Number(row.total_amount),                            // 5. totalAmount (number)
        Number(row.amount_paid),                             // 6. amountPaid (number)
        new Date(row.date),                                  // 7. date (Date)
        row.bill_file_id ? String(row.bill_file_id) : null,  // 8. billFileId (string | null)
        row.last_date_of_payment ? new Date(row.last_date_of_payment) : null // 9. lastDate (Date | null)
      );
    });
  }

  async updateAmountPaid(id: string, amountPaid: number): Promise<void> {
    const { error } = await supabase.from('spends').update({ amount_paid: amountPaid } as any).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async updateLastDateOfPayment(id: string, lastDate: Date | null): Promise<void> {
    const { error } = await supabase.from('spends').update({ 
      last_date_of_payment: lastDate ? lastDate.toISOString() : null 
    } as any).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async updateItemName(id: string, name: string): Promise<void> {
    const { error } = await supabase.from('spends').update({ item_name: name } as any).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async updateTotalAmount(id: string, amount: number): Promise<void> {
    const { error } = await supabase.from('spends').update({ total_amount: amount } as any).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async updatePaymentDate(id: string, date: Date): Promise<void> {
    const { error } = await supabase.from('spends').update({ date: date.toISOString() } as any).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('spends').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteByCategoryId(categoryId: string): Promise<void> {
    const { error } = await supabase.from('spends').delete().eq('category_id', categoryId);
    if (error) throw new Error(error.message);
  }
}