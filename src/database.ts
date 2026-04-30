import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { DB_NAME } from './constant';

export const sqlite = new SQLiteConnection(CapacitorSQLite);

const SCHEMA = `
  -- Habilitar claves foráneas
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    zip_code TEXT,
    percentage_deducted INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date_of_birth TEXT, -- ISO8601 YYYY-MM-DD
    phone TEXT,
    default_location_id INTEGER,
    bail_amount INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_couple INTEGER DEFAULT 0,
    FOREIGN KEY (default_location_id) REFERENCES locations (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    location_id INTEGER,
    appointment_datetime TEXT NOT NULL, -- ISO8601
    amount INTEGER DEFAULT 0,
    return_amount INTEGER DEFAULT 0,
    payment_method_id INTEGER,
    is_first_appointment INTEGER DEFAULT 0,
    is_cancelled INTEGER DEFAULT 0,
    is_finished INTEGER DEFAULT 0,
    is_couple_appointment INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE SET NULL,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER,
    content TEXT NOT NULL,
    note_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL
  );
  
  CREATE TABLE IF NOT EXISTS default_price_by_location (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    type_sesion INTEGER,
    amount INTEGER DEFAULT 0,
    first_appointment_amount INTEGER DEFAULT 0,
    FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE SET NULL
  );
  
  CREATE TABLE IF NOT EXISTS synchronization_google_drive (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    last_update TEXT NOT NULL,
    number_of_changes INTEGER DEFAULT 0,
  );
`;

export const initializeDatabase = async (): Promise<SQLiteDBConnection> => {
  try {
    if (Capacitor.getPlatform() === 'web') {
      await sqlite.initWebStore();
    }

    const ret = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

    let db: SQLiteDBConnection;
    if (ret.result && isConn) {
      db = await sqlite.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    }

    await db.open();
    
    // Ejecutar el esquema
    await db.execute(SCHEMA);

    if (Capacitor.getPlatform() === 'web') {
      await sqlite.saveToStore(DB_NAME);
    }

    console.log("✅ Database and Schema initialized");
    return db;
  } catch (error) {
    console.error("❌ DB Init Error:", error);
    throw error;
  }
};