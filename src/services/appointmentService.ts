import { sqlite } from '../database.ts';
import { Capacitor } from '@capacitor/core';
import type { Appointment } from '../types.ts';
import { DB_NAME } from '../constant.ts';
import { syncService } from './syncService.ts';

const getDb = async () => {
  return await sqlite.retrieveConnection(DB_NAME, false);
};

const syncWeb = async () => {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }
};

export const appointmentService = {
  // 1. Obtener cita por ID (con nombres de relaciones)
  async getAppointmentById(id: number) {
    const db = await getDb();
    const sql = `
      SELECT a.*, p.name as patient_name, l.name as location_name, pm.name as payment_method_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN payment_methods pm ON a.payment_method_id = pm.id
      WHERE a.id = ?;
    `;
    const result = await db.query(sql, [id]);
    return result.values?.length ? (result.values[0] as Appointment) : null;
  },

  // 2. Crear cita
  async createAppointment(appointment: Partial<Appointment>) {
    const db = await getDb();
    const sql = `
      INSERT INTO appointments (
        patient_id, location_id, appointment_datetime, amount, 
        payment_method_id, is_first_appointment, is_couple_appointment, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1);
    `;
    const params = [
      appointment.patient_id,
      appointment.location_id || null,
      appointment.appointment_datetime,
      appointment.amount || 0,
      appointment.payment_method_id || null,
      appointment.is_first_appointment || 0,
      appointment.is_couple_appointment || 0
    ];
    const result = await db.run(sql, params);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 3. Actualizar información general
  async updateAppointment(appointment: Appointment) {
    const db = await getDb();
    const sql = `
      UPDATE appointments SET 
        location_id = ?, appointment_datetime = ?, amount = ?, 
        payment_method_id = ?, is_first_appointment = ?, is_couple_appointment = ?
      WHERE id = ?;
    `;
    const params = [
      appointment.location_id, appointment.appointment_datetime, appointment.amount,
      appointment.payment_method_id, appointment.is_first_appointment,
      appointment.is_couple_appointment, appointment.id
    ];
    const result = await db.run(sql, params);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 4. Eliminar lógico
  async deleteAppointment(id: number) {
    const db = await getDb();
    const result = await db.run(`UPDATE appointments SET is_active = 0 WHERE id = ?;`, [id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 5. Citas activas de un PACIENTE
  async getActiveAppointmentsByPatient(patientId: number) {
    const db = await getDb();
    const sql = `SELECT * FROM appointments WHERE patient_id = ? AND is_active = 1 ORDER BY appointment_datetime DESC;`;
    const result = await db.query(sql, [patientId]);
    syncService.incrementChanges();
    return result.values as Appointment[];
  },

  // 5.1. Citas activas de un PACIENTE
  async checkIfPatientIsFirstAppointment(patientId: number) {
    const db = await getDb();
    const sql = `SELECT * FROM appointments WHERE patient_id = ? AND is_active = 1;`;
    const result = await db.query(sql, [patientId]);
    let list_appointment: Appointment[] = result.values as Appointment[];

    return list_appointment.length === 0;
  },

  // 6. Citas por MÉTODO DE PAGO
  async getAppointmentsByPaymentMethod(paymentMethodId: number) {
    const db = await getDb();
    const sql = `SELECT * FROM appointments WHERE payment_method_id = ? AND is_active = 1;`;
    const result = await db.query(sql, [paymentMethodId]);
    return result.values as Appointment[];
  },

  // 7. Citas CANCELADAS de un paciente
  async getCancelledAppointmentsByPatient(patientId: number) {
    const db = await getDb();
    const sql = `SELECT * FROM appointments WHERE patient_id = ? AND is_cancelled = 1 AND is_active = 1;`;
    const result = await db.query(sql, [patientId]);
    return result.values as Appointment[];
  },

  // 8. Citas TERMINADAS de un paciente
  async getFinishedAppointmentsByPatient(patientId: number) {
    const db = await getDb();
    const sql = `SELECT * FROM appointments WHERE patient_id = ? AND is_finished = 1 AND is_active = 1;`;
    const result = await db.query(sql, [patientId]);
    return result.values as Appointment[];
  },

  // 9. Marcar como cancelada
  async markAsCancelled(id: number, status: boolean = true) {
    const db = await getDb();
    const result = await db.run(`UPDATE appointments SET is_cancelled = ? WHERE id = ?;`, [status ? 1 : 0, id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 10. Marcar como terminada
  async markAsFinished(id: number, status: boolean = true) {
    const db = await getDb();
    const result = await db.run(`UPDATE appointments SET is_finished = ? WHERE id = ?;`, [status ? 1 : 0, id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 11. Actualizar fecha y hora
  async updateDateTime(id: number, newDateTime: string) {
    const db = await getDb();
    const result = await db.run(`UPDATE appointments SET appointment_datetime = ? WHERE id = ?;`, [newDateTime, id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 12. Actualizar método de pago
  async updatePaymentMethod(id: number, paymentMethodId: number | null) {
    const db = await getDb();
    const result = await db.run(`UPDATE appointments SET payment_method_id = ? WHERE id = ?;`, [paymentMethodId, id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // 13. Actualizar detalles de pago (método de pago y cambio devuelto)
  async updatePaymentDetails(id: number, paymentMethodId: number | null, returnAmount: number) {
    const db = await getDb();
    const sql = `
      UPDATE appointments 
      SET payment_method_id = ?, return_amount = ? 
      WHERE id = ?;
    `;
    const result = await db.run(sql, [paymentMethodId, returnAmount, id]);
    await syncWeb();
    syncService.incrementChanges();
    return result;
  },

  // Obtener citas en un rango de fechas (con nombres de paciente)
  async getAppointmentsByDateRange(startDate: string, endDate: string) {
    const db = await getDb();
    const sql = `
      SELECT a.*, p.name as patient_name, l.name as location_name 
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.is_active = 1 
      AND replace(a.appointment_datetime, 'T', ' ') BETWEEN ? AND ?
      ORDER BY a.appointment_datetime ASC;
    `;
    const result = await db.query(sql, [startDate, endDate]);
    return result.values as Appointment[];
  },

  // Obtener citas en un rango de fechas para ver si hay disponibilidad
  async checkTimeSlotOverlap(startDate: string, endDate: string) {
    const db = await getDb();

    const sql = `
      SELECT a.*, p.name as patient_name, l.name as location_name 
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.is_active = 1 
        -- 1. Reemplazamos la 'T' por espacio en la DB para igualar formatos
        -- 2. Sumamos la hora al valor limpio
        AND ? < datetime(replace(a.appointment_datetime, 'T', ' '), '+1 hour') 
        -- 3. Comparamos el valor limpio contra tu endDate
        AND replace(a.appointment_datetime, 'T', ' ') < ?
      ORDER BY a.appointment_datetime ASC;
    `;

    const result = await db.query(sql, [startDate, endDate]);
    return result.values as Appointment[];
  }

};