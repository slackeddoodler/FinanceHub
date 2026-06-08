import { ICategoryRepository } from "../../domain/interfaces/repositories";
import { Category } from "../../domain/entities/Category";
import { getDb } from "../database/pglite";

export class PGliteCategoryRepository implements ICategoryRepository {
  async save(category: Category): Promise<void> {
    const db = await getDb();
    await db.query(
      `INSERT INTO categories (id, name, allocated_budget, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       allocated_budget = EXCLUDED.allocated_budget`,
      [category.id, category.name, category.allocatedBudget, category.createdAt]
    );
  }

  async findAll(): Promise<Category[]> {
    const db = await getDb();
    const res = await db.query(`SELECT * FROM categories ORDER BY created_at ASC`);
    const cats = res.rows.map((row: any) => new Category(
      row.id, row.name, row.allocated_budget, new Date(row.created_at)
    ));

    if (typeof window !== "undefined" && window.location.pathname.includes("/dashboard")) {
      const saved = sessionStorage.getItem("financehub_active_cats");
      if (saved) {
        try {
          const activeCats: string[] = JSON.parse(saved);
          if (activeCats.length > 0) {
            return cats.filter(c => activeCats.includes(c.id));
          }
        } catch(e) {}
      }
    }
    return cats;
  }

  async updateName(id: string, newName: string): Promise<void> {
    const db = await getDb();
    await db.query(`UPDATE categories SET name = $1 WHERE id = $2`, [newName, id]);
  }

  // CRITICAL FIX: SQL execution to securely update the numerical budget
  async updateBudget(id: string, newBudget: number): Promise<void> {
    const db = await getDb();
    await db.query(`UPDATE categories SET allocated_budget = $1 WHERE id = $2`, [newBudget, id]);
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.query(`DELETE FROM categories WHERE id = $1`, [id]);
  }
}