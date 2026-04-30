import { sqlite } from '../database.ts';
import { Capacitor } from '@capacitor/core';
import { DB_NAME } from '../constant.ts';
import type { Location } from '../types.ts';

const getDb = async () => {
  return await sqlite.retrieveConnection(DB_NAME, false);
};

const syncWeb = async () => {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }
};

export const locationService = {
  // 1. Obtener todas las ubicaciones activas
  async getAllActiveLocations() {
    const db = await getDb();
    const sql = `SELECT * FROM locations WHERE is_active = 1 ORDER BY name ASC;`;
    const result = await db.query(sql);
    return result.values as Location[];
  },

  // 2. Crear una nueva ubicación
  async createLocation(name: string, address?: string, city?: string, zipCode?: string, percentage_deducted?: number) {
    const db = await getDb();
    const sql = `
      INSERT INTO locations (name, address, city, zip_code, percentage_deducted, is_active)
      VALUES (?, ?, ?, ?, ?, 1);
    `;
    const params = [name, address || null, city || null, zipCode || null, percentage_deducted || null];
    const result = await db.run(sql, params);
    await syncWeb();
    return result;
  },

  // 3. Actualizar información de una ubicación
  async updateLocation(location: Location) {
    const db = await getDb();
    const sql = `
      UPDATE locations 
      SET name = ?, address = ?, city = ?, zip_code = ?, percentage_deducted = ?
      WHERE id = ?;
    `;
    const params = [
      location.name, 
      location.address || null, 
      location.city || null, 
      location.zip_code || null, 
      location.percentage_deducted || 0,
      location.id
    ];
    const result = await db.run(sql, params);
    await syncWeb();
    return result;
  },

  // 4. Eliminar Lógico (is_active = 0)
  async deleteLocation(id: number) {
    const db = await getDb();
    // Nota: No borramos físicamente para no romper el historial de citas vinculadas
    const sql = `UPDATE locations SET is_active = 0 WHERE id = ?;`;
    const result = await db.run(sql, [id]);
    await syncWeb();
    return result;
  },

  // Extra: Obtener una ubicación por ID (útil para detalles)
  async getLocationById(id: number) {
    const db = await getDb();
    const sql = `SELECT * FROM locations WHERE id = ?;`;
    const result = await db.query(sql, [id]);
    return result.values && result.values.length > 0 ? (result.values[0] as Location) : null;
  }
};