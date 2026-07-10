import { supabase } from './supabase';

/**
 * Drop-in Firebase → Supabase migration layer.
 * Provides same API for user memories and session history.
 */
export const memoryApi = {
  async getMemories(userId: string) {
    const { data, error } = await supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  },

  async saveMemory(userId: string, memory: { title: string; content: string }) {
    const { data, error } = await supabase.from('user_memories').insert([
      {
        user_id: userId,
        title: memory.title,
        content: memory.content,
        created_at: new Date(),
      },
    ]);

    if (error) throw error;
    return data?.[0];
  },

  async getSessionHistory(userId: string) {
    const { data, error } = await supabase
      .from('session_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
