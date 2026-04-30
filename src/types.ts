export interface Patient {
  id?: number;
  name: string;
  date_of_birth?: string;
  phone?: string;
  default_location_id?: number;
  is_active: number;
  is_couple: boolean;
}

export interface Appointment {
  id?: number;
  patient_id: number;
  location_id?: number | null;
  appointment_datetime: string; // ISO8601
  amount: number; // En céntimos
  payment_method_id?: number | null;
  is_first_appointment: number;
  is_cancelled: number;
  is_finished: number;
  is_couple_appointment: number;
  is_active: number;
  
  // Campos opcionales para cuando hacemos JOIN
  patient_name?: string;
  location_name?: string;
  payment_method_name?: string;
}

export interface Location {
  id?: number;
  name: string;
  address?: string;
  city?: string;
  zip_code?: string;
  percentage_deducted?: number;
  is_active: number;
}

export interface PaymentMethod {
  id?: number;
  name: string;
  is_active: number;
}

export interface Note {
  id?: number;
  patient_id: number;
  appointment_id?: number | null;
  content: string;
  note_date: string; // ISO8601
  is_active: number;
}

export interface DefaultPriceByLocation {
  id?: number;
  location_id: number;
  type_sesion?: number;
  amount: number;
  first_appointment_amount: number;
}