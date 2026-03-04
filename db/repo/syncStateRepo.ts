import { getFirstAsync, runAsync } from "../sqlite";

export const syncStateRepo = {
  async get(key: string): Promise<string | null> {
    const row = await getFirstAsync<any>(`SELECT value FROM sync_state WHERE key = ?`, [key]);
    return row?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    await runAsync(
      `INSERT INTO sync_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
      [key, value]
    );
  },
};