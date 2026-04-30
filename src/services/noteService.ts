import { sqlite } from '../database.ts';
import { Capacitor } from '@capacitor/core';
import { DB_NAME } from '../constant.ts';
import type { Note } from '../types.ts';
import { syncService } from './syncService.ts';

const getDb = async () => {
  return await sqlite.retrieveConnection(DB_NAME, false);
};

const syncWeb = async () => {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }
};

export const noteService = {
  // 1. Obtener una nota por ID
  async getNoteById(id: number) {
    const db = await getDb();
    const sql = `SELECT * FROM notes WHERE id = ?;`;
    const result = await db.query(sql, [id]);
    return result.values?.length ? (result.values[0] as Note) : null;
  },

  // 2. Crear una nota (Vinculada a paciente y opcionalmente a cita)
  async createNote(patientId: number, content: string, appointmentId: number | null = null) {
    const db = await getDb();
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO notes (patient_id, appointment_id, content, note_date, is_active)
      VALUES (?, ?, ?, ?, 1);
    `;
    const result = await db.run(sql, [patientId, appointmentId, content, now]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 3. Actualizar información de una nota
  async updateNote(id: number, content: string) {
    const db = await getDb();
    const sql = `UPDATE notes SET content = ? WHERE id = ?;`;
    const result = await db.run(sql, [content, id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 4. Eliminar Lógico (is_active = 0)
  async deleteNote(id: number) {
    const db = await getDb();
    const sql = `UPDATE notes SET is_active = 0 WHERE id = ?;`;
    const result = await db.run(sql, [id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 5. Obtener todas las notas activas de un PACIENTE
  async getActiveNotesByPatient(patientId: number) {
    const db = await getDb();
    const sql = `
      SELECT * FROM notes 
      WHERE patient_id = ? AND is_active = 1 
      ORDER BY note_date DESC;
    `;
    const result = await db.query(sql, [patientId]);
    return result.values as Note[];
  },

  // 6. Obtener las notas activas de una CITA
  async getActiveNotesByAppointment(appointmentId: number) {
    const db = await getDb();
    const sql = `
      SELECT * FROM notes 
      WHERE appointment_id = ? AND is_active = 1 
      ORDER BY note_date DESC;
    `;
    const result = await db.query(sql, [appointmentId]);
    return result.values as Note[];
  },

  // 7. Obtener todas las notas "eliminadas" de un PACIENTE
  async getDeletedNotesByPatient(patientId: number) {
    const db = await getDb();
    const sql = `
      SELECT * FROM notes 
      WHERE patient_id = ? AND is_active = 0 
      ORDER BY note_date DESC;
    `;
    const result = await db.query(sql, [patientId]);
    return result.values as Note[];
  }
};