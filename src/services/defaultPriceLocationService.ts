import { sqlite } from '../database.ts';
import { Capacitor } from '@capacitor/core';
import { DB_NAME } from '../constant.ts';
import type { DefaultPriceByLocation } from '../types.ts';

const getDb = async () => {
  return await sqlite.retrieveConnection(DB_NAME, false);
};

const syncWeb = async () => {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }
};

export const defaultPriceLocationService = {
  // 1. Obtener un precio por defecto por ID
  async getPriceById(id: number) {
    const db = await getDb();
    const sql = `SELECT * FROM default_price_by_location WHERE id = ?;`;
    const result = await db.query(sql, [id]);
    return result.values?.length ? (result.values[0] as DefaultPriceByLocation) : null;
  },

  // 2. Crear un precio por defecto
  async createDefaultPrice(location_id: number, type_sesion: number, amount: number, first_appointment_amount: number) {
    const db = await getDb();
    const sql = `
      INSERT INTO default_price_by_location (location_id, type_sesion, amount, first_appointment_amount)
      VALUES (?, ?, ?, ?);
    `;
    const result = await db.run(sql, [location_id, type_sesion, amount, first_appointment_amount]);
    await syncWeb();
    return result;
  },

  // 3. Actualizar información de un precio por defecto
  async updateDefaultPrice(id: number, type_sesion: number, amount: number, first_appointment_amount: number) {
    const db = await getDb();
    const sql = `
      UPDATE default_price_by_location 
      SET type_sesion = ?, amount = ?, first_appointment_amount = ? 
      WHERE id = ?;
    `;
    const result = await db.run(sql, [type_sesion, amount, first_appointment_amount, id]);
    await syncWeb();
    return result;
  },

  // 4. Obtener todos los precios por defecto de una LOCALIZACION
  async getDefaultPriceByLocation(location_id: number) {
    const db = await getDb();
    const sql = `
      SELECT * FROM default_price_by_location 
      WHERE location_id = ?;
    `;
    const result = await db.query(sql, [location_id]);
    return result.values as DefaultPriceByLocation[];
  },
  
  // 5. Obtener el precio por defecto de una LOCALIZACION y el tipo de sesión (individual o pareja)
  async getDefaultPriceByLocationAndType(location_id: number) {
    const db = await getDb();
    const sql = `
      SELECT * FROM default_price_by_location 
      WHERE location_id = ?;
    `;
    const result = await db.query(sql, [location_id]); 
    
    return result.values as DefaultPriceByLocation[];
  },

};