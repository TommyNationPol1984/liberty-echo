import { apiJson } from "./apiClient";
import { getCurrentUser } from "./supabase";

/**
 * Firebase → Supabase migration layer
 * Drop-in replacement for Firebase Firestore calls
 * - user_memories: store user session notes/metadata
 * - session_history: store synthesis history
 */

export interface UserMemory {
  id: string;
  userId: string;
  key: string; // e.g., "preferred_voice", "last_synthesis"
  value: unknown;
  created_at: string;
  updated_at: string;
}

export interface SessionHistory {
  id: string;
  userId: string;
  text: string;
  voiceId: string;
  audioUrl: string;
  duration: number;
  charsUsed: number;
  created_at: string;
}

export const memoryApi = {
  /**
   * Get user memory by key
   */
  async getMemory(key: string): Promise<unknown | null> {
    try {
      const user = await getCurrentUser();
      if (!user) return null;

      const data = await apiJson<UserMemory>(
        `/api/memories/${key}`
      );
      return data?.value ?? null;
    } catch (err) {
      console.error(`Failed to get memory "${key}":`, err);
      return null;
    }
  },

  /**
   * Set user memory
   */
  async setMemory(key: string, value: unknown): Promise<void> {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    await apiJson(`/api/memories/${key}`, {
      method: "POST",
      body: { value },
    });
  },

  /**
   * Get session history
   */
  async getSessionHistory(limit: number = 50): Promise<SessionHistory[]> {
    const user = await getCurrentUser();
    if (!user) return [];

    try {
      return await apiJson<SessionHistory[]>(
        `/api/session-history?limit=${limit}`
      );
    } catch (err) {
      console.error("Failed to fetch session history:", err);
      return [];
    }
  },

  /**
   * Add to session history
   */
  async addSessionEntry(
    text: string,
    voiceId: string,
    audioUrl: string,
    duration: number,
    charsUsed: number
  ): Promise<void> {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    await apiJson(`/api/session-history`, {
      method: "POST",
      body: {
        text,
        voiceId,
        audioUrl,
        duration,
        charsUsed,
      },
    });
  },
};
