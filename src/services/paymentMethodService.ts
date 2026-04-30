import { sqlite } from '../database.ts';
import { Capacitor } from '@capacitor/core';
import { DB_NAME } from '../constant';
import type { PaymentMethod } from '../types.ts';
import { syncService } from './syncService.ts';

const getDb = async () => {
  return await sqlite.retrieveConnection(DB_NAME, false);
};

const syncWeb = async () => {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }
};

export const paymentMethodService = {
  // 1. Obtener un método de pago por ID
  async getPaymentMethodById(id: number) {
    const db = await getDb();
    const sql = `SELECT * FROM payment_methods WHERE id = ?;`;
    const result = await db.query(sql, [id]);
    return result.values?.length ? (result.values[0] as PaymentMethod) : null;
  },

  // 2. Obtener todos los métodos de pago ACTIVOS
  async getAllActivePaymentMethods() {
    const db = await getDb();
    const sql = `SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY name ASC;`;
    const result = await db.query(sql);
    return result.values as PaymentMethod[];
  },

  // 3. Crear un nuevo método de pago
  async createPaymentMethod(name: string) {
    const db = await getDb();
    const sql = `INSERT INTO payment_methods (name, is_active) VALUES (?, 1);`;
    const result = await db.run(sql, [name]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 4. Actualizar información
  async updatePaymentMethod(method: PaymentMethod) {
    const db = await getDb();
    const sql = `UPDATE payment_methods SET name = ? WHERE id = ?;`;
    const result = await db.run(sql, [method.name, method.id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 5. Eliminar Lógico (is_active = 0)
  async deletePaymentMethod(id: number) {
    const db = await getDb();
    const sql = `UPDATE payment_methods SET is_active = 0 WHERE id = ?;`;
    const result = await db.run(sql, [id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 6. Obtener todos los métodos de pago ELIMINADOS (is_active = 0)
  async getDeletedPaymentMethods() {
    const db = await getDb();
    const sql = `SELECT * FROM payment_methods WHERE is_active = 0 ORDER BY name ASC;`;
    const result = await db.query(sql);
    return result.values as PaymentMethod[];
  },
  
  // Extra: Reactivar un método de pago eliminado
  async restorePaymentMethod(id: number) {
    const db = await getDb();
    const sql = `UPDATE payment_methods SET is_active = 1 WHERE id = ?;`;
    const result = await db.run(sql, [id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  }
};