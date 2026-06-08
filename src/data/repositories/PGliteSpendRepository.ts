import { ISpendRepository } from "../../domain/interfaces/repositories";
import { SpendItem } from "../../domain/entities/SpendItem";
import { getDb } from "../database/pglite";

export class PGliteSpendRepository implements ISpendRepository {
  async save(item: SpendItem): Promise<void> {
    const db = await getDb();
    await db.query(
      `INSERT INTO spend_items (id, category_id, item_name, description, total_amount, amount_paid, date, bill_file_id, last_date_of_payment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
       category_id = EXCLUDED.category_id,
       item_name = EXCLUDED.item_name,
       description = EXCLUDED.description,
       total_amount = EXCLUDED.total_amount,
       amount_paid = EXCLUDED.amount_paid,
       date = EXCLUDED.date,
       bill_file_id = EXCLUDED.bill_file_id,
       last_date_of_payment = EXCLUDED.last_date_of_payment`,
      [item.id, item.categoryId, item.itemName, item.description, item.totalAmount, item.amountPaid, item.date, item.billFileId || null, item.lastDateOfPayment || null]
    );
  }

  async findByDateRange(start: Date, end: Date): Promise<SpendItem[]> {
    const db = await getDb();
    const res = await db.query(`SELECT * FROM spend_items WHERE date >= $1 AND date <= $2`, [start, end]);
    const items = res.rows.map((row: any) => new SpendItem(
      row.id, row.category_id, row.item_name, row.description,
      row.total_amount, row.amount_paid, new Date(row.date), 
      row.bill_file_id, row.last_date_of_payment ? new Date(row.last_date_of_payment) : null
    ));

    // CRITICAL FIX: Globally enforce multi-selection persistence strictly for the Dashboard layout
    if (typeof window !== "undefined" && window.location.pathname.includes("/dashboard")) {
      const saved = sessionStorage.getItem("financehub_active_cats");
      if (saved) {
        try {
          const activeCats: string[] = JSON.parse(saved);
          if (activeCats.length > 0) {
            return items.filter(item => activeCats.includes(item.categoryId));
          }
        } catch(e) {}
      }
    }
    return items;
  }

  async updateAmountPaid(id: string, amountPaid: number): Promise<void> {
    const db = await getDb();
    await db.query(`UPDATE spend_items SET amount_paid = $1 WHERE id = $2`, [amountPaid, id]);
  }

  async updateLastDateOfPayment(id: string, lastDate: Date | null): Promise<void> {
    const db = await getDb();
    await db.query(`UPDATE spend_items SET last_date_of_payment = $1 WHERE id = $2`, [lastDate, id]);
  }

  async updateItemName(id: string, name: string): Promise<void> {
    const db = await getDb();
    await db.query(`UPDATE spend_items SET item_name = $1 WHERE id = $2`, [name, id]);
  }

  async updateTotalAmount(id: string, amount: number): Promise<void> {
    const db = await getDb();
    await db.query(`UPDATE spend_items SET total_amount = $1 WHERE id = $2`, [amount, id]);
  }

  async updatePaymentDate(id: string, date: Date): Promise<void> {
    const db = await getDb();
    await db.query(`UPDATE spend_items SET date = $1 WHERE id = $2`, [date, id]);
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.query(`DELETE FROM spend_items WHERE id = $1`, [id]);
  }

  async deleteByCategoryId(categoryId: string): Promise<void> {
    const db = await getDb();
    await db.query(`DELETE FROM spend_items WHERE category_id = $1`, [categoryId]);
  }
}