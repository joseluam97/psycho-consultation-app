import { sqlite } from '../database.ts';
import { DB_NAME } from '../constant';
import type { SyncData } from '../types';

const getDb = async () => {
  return await sqlite.retrieveConnection(DB_NAME, false);
};

export const syncService = {
  // Obtener los datos actuales de sincronización
  async getSyncData(): Promise<SyncData | null> {
    const db = await getDb();
    const result = await db.query('SELECT * FROM synchronization_google_drive LIMIT 1;');
    if (result.values && result.values.length > 0) {
      return result.values[0];
    }
    return null;
  },

  // Incrementar el contador de cambios
  async incrementChanges() {
    const db = await getDb();
    const current = await this.getSyncData();
    if (!current) {
      const now = new Date().toISOString();
      await db.run('INSERT INTO synchronization_google_drive (last_update, number_of_changes) VALUES (?, ?);', [now, 1]);
    } else {
      await db.run('UPDATE synchronization_google_drive SET number_of_changes = number_of_changes + 1 WHERE id = ?;', [current.id]);
    }
  },

  // Resetear tras sincronización exitosa
  async resetAfterSync() {
    const db = await getDb();
    const now = new Date().toISOString();
    const current = await this.getSyncData();
    if (!current) {
      await db.run('INSERT INTO synchronization_google_drive (last_update, number_of_changes) VALUES (?, ?);', [now, 0]);
    } else {
      await db.run('UPDATE synchronization_google_drive SET last_update = ?, number_of_changes = 0 WHERE id = ?;', [now, current.id]);
    }
  }
};