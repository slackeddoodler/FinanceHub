import { ICategoryRepository } from "../../domain/interfaces/repositories";
import { Category } from "../../domain/entities/Category";
import { supabase } from "../database/supabase";

export class SupabaseCategoryRepository implements ICategoryRepository {
  constructor(private isPersonal: boolean = false, private userId: string | null = null) {}

  async save(category: Category): Promise<void> {
    if (this.isPersonal && !this.userId) {
      throw new Error("Critical Error: Missing User UUID for Personal Category creation.");
    }

    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      allocated_budget: category.allocatedBudget,
      created_at: category.createdAt.toISOString(),
      user_id: this.isPersonal ? this.userId : null
    });
    if (error) throw new Error(error.message);
  }

  async findAll(): Promise<Category[]> {
    let query = supabase.from('categories').select('*').order('created_at', { ascending: true });
    
    // Strict Database-Level Partitioning
    if (this.isPersonal) {
      if (!this.userId) return []; // Fail-safe: prevent cross-contamination if ID is missing
      query = query.eq('user_id', this.userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query;
    
    if (error) throw new Error(error.message);
    if (!data) return [];

    const cats = data.map(row => new Category(
      row.id, 
      row.name, 
      Number(row.allocated_budget), 
      new Date(row.created_at)
    ));

    return cats;
  }

  async updateName(id: string, newName: string): Promise<void> {
    let query = supabase.from('categories').update({ name: newName }).eq('id', id);
    query = this.isPersonal ? query.eq('user_id', this.userId) : query.is('user_id', null);
    
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  async updateBudget(id: string, newBudget: number): Promise<void> {
    let query = supabase.from('categories').update({ allocated_budget: newBudget }).eq('id', id);
    query = this.isPersonal ? query.eq('user_id', this.userId) : query.is('user_id', null);
    
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    let query = supabase.from('categories').delete().eq('id', id);
    query = this.isPersonal ? query.eq('user_id', this.userId) : query.is('user_id', null);
    
    const { error } = await query;
    if (error) throw new Error(error.message);
  }
}