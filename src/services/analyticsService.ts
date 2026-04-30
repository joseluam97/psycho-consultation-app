import { sqlite } from '../database.ts';
import { DB_NAME } from '../constant';

const getDb = async () => {
  return await sqlite.retrieveConnection(DB_NAME, false);
};

export const analyticsService = {
  
  // 1 & 2. Sumatorio de ingresos (Filtrado opcional por ubicación y método de pago)
  async getTotalRevenue(startDate: string, endDate: string, locationId?: number, paymentMethodId?: number) {
    const db = await getDb();
    let sql = `
      SELECT SUM(amount) as total 
      FROM appointments 
      WHERE is_finished = 1 AND is_active = 1 
      AND appointment_datetime BETWEEN ? AND ?
    `;
    const params: any[] = [startDate, endDate];

    if (locationId) {
      sql += ` AND location_id = ?`;
      params.push(locationId);
    }
    if (paymentMethodId) {
      sql += ` AND payment_method_id = ?`;
      params.push(paymentMethodId);
    }

    const result = await db.query(sql, params);
    return (result.values?.[0]?.total || 0) / 100; // Convertimos céntimos a euros
  },

  // 3, 4, 5 & 6. Conteo de citas (Terminadas/Canceladas por rango y ubicación)
  async getAppointmentCount(startDate: string, endDate: string, type: 'finished' | 'cancelled', locationId?: number) {
    const db = await getDb();
    const column = type === 'finished' ? 'is_finished' : 'is_cancelled';
    let sql = `
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE ${column} = 1 AND is_active = 1 
      AND appointment_datetime BETWEEN ? AND ?
    `;
    const params: any[] = [startDate, endDate];

    if (locationId) {
      sql += ` AND location_id = ?`;
      params.push(locationId);
    }

    const result = await db.query(sql, params);
    return result.values?.[0]?.count || 0;
  },

  // 7. Número de citas terminadas y canceladas de un PACIENTE específico
  async getPatientStats(patientId: number, startDate: string, endDate: string) {
    const db = await getDb();
    const sql = `
      SELECT 
        SUM(CASE WHEN is_finished = 1 THEN 1 ELSE 0 END) as finished,
        SUM(CASE WHEN is_cancelled = 1 THEN 1 ELSE 0 END) as cancelled
      FROM appointments 
      WHERE patient_id = ? AND is_active = 1
      AND appointment_datetime BETWEEN ? AND ?
    `;
    const result = await db.query(sql, [patientId, startDate, endDate]);
    return {
      finished: result.values?.[0]?.finished || 0,
      cancelled: result.values?.[0]?.cancelled || 0
    };
  },

  // 8. Importe total gastado por un PACIENTE
  async getPatientTotalSpent(patientId: number, startDate: string, endDate: string) {
    const db = await getDb();
    const sql = `
      SELECT SUM(amount) as total 
      FROM appointments 
      WHERE patient_id = ? AND is_finished = 1 AND is_active = 1
      AND appointment_datetime BETWEEN ? AND ?
    `;
    const result = await db.query(sql, [patientId, startDate, endDate]);
    return (result.values?.[0]?.total || 0) / 100;
  },

  // 9. Distribución por Método de Pago (Para ver cuál es el más usado)
  async getPaymentMethodDistribution(startDate: string, endDate: string) {
    const db = await getDb();
    const sql = `
      SELECT pm.name, COUNT(a.id) as count, SUM(a.amount) / 100.0 as total_revenue
      FROM appointments a
      JOIN payment_methods pm ON a.payment_method_id = pm.id
      WHERE a.is_finished = 1 AND a.is_active = 1
      AND a.appointment_datetime BETWEEN ? AND ?
      GROUP BY pm.id
    `;
    const result = await db.query(sql, [startDate, endDate]);
    return result.values || [];
  },

  // 10. Tasa de Retención (Pacientes que han tenido más de una cita en un rango)
  async getRecurrentPatientsCount(startDate: string, endDate: string) {
    const db = await getDb();
    const sql = `
      SELECT COUNT(*) as recurrent_count FROM (
        SELECT patient_id 
        FROM appointments 
        WHERE is_active = 1 AND is_finished = 1
        AND appointment_datetime BETWEEN ? AND ?
        GROUP BY patient_id
        HAVING COUNT(id) > 1
      )
    `;
    const result = await db.query(sql, [startDate, endDate]);
    return result.values?.[0]?.recurrent_count || 0;
  },

  // 11. Ingreso medio por sesión (Ticket medio)
  async getAverageIncomePerSession(startDate: string, endDate: string) {
    const db = await getDb();
    const sql = `
      SELECT AVG(amount) / 100.0 as average
      FROM appointments 
      WHERE is_finished = 1 AND is_active = 1
      AND appointment_datetime BETWEEN ? AND ?
    `;
    const result = await db.query(sql, [startDate, endDate]);
    return result.values?.[0]?.average || 0;
  }
};