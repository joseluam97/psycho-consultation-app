import { DB_NAME } from '../constant.ts';
import { sqlite } from '../database.ts';
import { Capacitor } from '@capacitor/core';
import type { Patient } from '../types.ts';

// Helper para obtener la base de datos abierta
const getDb = async () => {
  return await sqlite.retrieveConnection(DB_NAME, false);
};

// Sincronizar con IndexedDB si estamos en la web
const syncWeb = async () => {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }
};

export const patientService = {
  // 1. Crear Paciente
  async createPatient(name: string, dob?: string, phone?: string, locationId?: number, is_couple?: number) {
    const db = await getDb();
    const sql = `
      INSERT INTO patients (name, date_of_birth, phone, default_location_id, is_active, is_couple) 
      VALUES (?, ?, ?, ?, 1, ?);
    `;
    const params = [name, dob || null, phone || null, locationId || null, is_couple || null];
    const result = await db.run(sql, params);
    await syncWeb();
    return result;
  },

  // 2. Actualizar Información
  async updatePatient(patient: Patient) {
    const db = await getDb();
    const sql = `
      UPDATE patients 
      SET name = ?, date_of_birth = ?, phone = ?, is_couple = ?
      WHERE id = ?;
    `;
    const result = await db.run(sql, [patient.name, patient.date_of_birth, patient.phone, patient.is_couple == true ? 1 : 0, patient.id]);
    await syncWeb();
    return result;
  },

  // 3. Eliminar Lógico (Active = 0)
  async deletePatient(id: number) {
    const db = await getDb();
    const sql = `UPDATE patients SET is_active = 0 WHERE id = ?;`;
    const result = await db.run(sql, [id]);
    await syncWeb();
    return result;
  },

  // 4. Modificar Ubicación por Defecto
  async updateDefaultLocation(patientId: number, locationId: number | null) {
    const db = await getDb();
    const sql = `UPDATE patients SET default_location_id = ? WHERE id = ?;`;
    const result = await db.run(sql, [locationId, patientId]);
    await syncWeb();
    return result;
  },

  // 5. Listar por Ubicación Específica
  async getPatientsByLocation(locationId: number) {
    const db = await getDb();
    const sql = `
      SELECT * FROM patients 
      WHERE default_location_id = ? AND is_active = 1;
    `;
    const result = await db.query(sql, [locationId]);
    return result.values as Patient[];
  },

  // 6. Obtener un paciente por ID
  async getPatientById(id: number) {
    const db = await getDb();
    const sql = `SELECT * FROM patients WHERE id = ?;`;
    const result = await db.query(sql, [id]);
    
    // Verificamos si existe y devolvemos el primer resultado
    if (result.values && result.values.length > 0) {
      return result.values[0] as Patient;
    }
    return null;
  },

  // 7: Obtener todos los pacientes activos
  async getAllActivePatients() {
    const db = await getDb();
    const sql = `SELECT * FROM patients WHERE is_active = 1 ORDER BY name ASC;`;
    const result = await db.query(sql);
    return result.values as Patient[];
  }
};