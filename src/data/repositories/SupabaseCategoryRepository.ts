import { ICategoryRepository } from "../../domain/interfaces/repositories";
import { Category } from "../../domain/entities/Category";
import { supabase } from "../database/supabase";

export class SupabaseCategoryRepository implements ICategoryRepository {
  async save(category: Category): Promise<void> {
    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      allocated_budget: category.allocatedBudget,
      created_at: category.createdAt.toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  async findAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw new Error(error.message);
    if (!data) return [];

    const cats = data.map(row => new Category(
      row.id, 
      row.name, 
      Number(row.allocated_budget), 
      new Date(row.created_at)
    ));

    // Preserve your existing session storage filtering logic
    if (typeof window !== "undefined" && window.location.pathname.includes("/dashboard")) {
      const saved = sessionStorage.getItem("financehub_active_cats");
      if (saved) {
        try {
          const activeCats: string[] = JSON.parse(saved);
          if (activeCats.length > 0) return cats.filter(c => activeCats.includes(c.id));
        } catch(e) {}
      }
    }
    return cats;
  }

  async updateName(id: string, newName: string): Promise<void> {
    const { error } = await supabase.from('categories').update({ name: newName }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async updateBudget(id: string, newBudget: number): Promise<void> {
    const { error } = await supabase.from('categories').update({ allocated_budget: newBudget }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}