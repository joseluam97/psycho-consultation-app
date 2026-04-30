import { useState, useEffect } from 'react';
import { locationService } from '../services/locationService';
import { patientService } from '../services/patientService';
import { appointmentService } from '../services/appointmentService';
import { AppointmentManager } from './AppointmentManager'; 
import { AppointmentForm } from './AppointmentForm';
import type { Location, Patient, Appointment } from '../types.ts';

interface LocationDetailProps {
  locationId: number;
}

export const LocationDetail = ({ locationId }: LocationDetailProps) => {
  const [location, setLocation] = useState<Location | null>(null);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  useEffect(() => {
    const loadInfo = async () => {
      const loc = await locationService.getLocationById(locationId);
      const pats = await patientService.getPatientsByLocation(locationId);
      setLocation(loc);
      setPatients(pats);
    };
    loadInfo();
  }, [locationId]);

  useEffect(() => {
    const loadAppointmentsForDate = async () => {
      setLoadingAppointments(true);
      try {
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);

        const allDayAppointments = await appointmentService.getAppointmentsByDateRange(
          start.toISOString(), 
          end.toISOString()
        );
        const locationAppointments = allDayAppointments.filter(a => a.location_id === locationId);
        
        setAppointments(locationAppointments);
      } catch (error) {
        console.error("Error cargando citas:", error);
      } finally {
        setLoadingAppointments(false);
      }
    };

    if (locationId) {
      loadAppointmentsForDate();
    }
  }, [selectedDate, locationId, showNewAppointmentModal, refreshTrigger]); 

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const handlePrevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const handleNextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };
  const handleToday = () => setSelectedDate(new Date());

  if (!location) return <div className="p-10 text-tema-texto">Cargando centro...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Cabecera del Centro */}
      <div className="bg-tema-fondo p-8 rounded-2xl border border-tema-borde shadow-sm flex justify-between items-center">
        <div>
          <span className="text-tema-acento font-bold text-xs uppercase tracking-widest">Centro Médico</span>
          <h2 className="text-3xl font-bold text-tema-titulos mt-1">{location.name}</h2>
          <p className="text-tema-texto mt-1">📍 {location.address}, {location.city}</p>
        </div>
        <button 
          onClick={() => setShowNewAppointmentModal(true)}
          className="bg-tema-acento text-white px-6 py-3 rounded-xl font-bold shadow-sm hover:opacity-90 transition-opacity"
        >
          + Nueva Cita Aquí
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: Pacientes */}
        {/* ... (Se mantiene igual) ... */}
        <div className="lg:col-span-1 bg-tema-fondo rounded-2xl border border-tema-borde shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-tema-borde">
            <h3 className="font-bold text-tema-titulos mb-3">Pacientes ({filteredPatients.length})</h3>
            <input 
              type="text" 
              placeholder="Buscar paciente..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full p-2 text-sm bg-tema-codigo border border-tema-borde rounded-lg text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredPatients.length === 0 ? (
              <p className="text-center text-sm text-tema-texto mt-4 italic">No hay resultados.</p>
            ) : (
              filteredPatients.map(p => (
                <div key={p.id} className="p-3 mb-2 bg-tema-codigo rounded-lg hover:border-tema-acento border border-transparent transition-colors cursor-pointer">
                  <p className="font-semibold text-sm text-tema-titulos">{p.name}</p>
                  <p className="text-xs text-tema-texto">{p.phone || 'Sin teléfono'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Citas */}
        <div className="lg:col-span-3 bg-tema-fondo rounded-2xl border border-tema-borde shadow-sm flex flex-col h-[600px]">
          
          <div className="p-4 border-b border-tema-borde flex items-center justify-between bg-tema-codigo/50 rounded-t-2xl">
            <h3 className="font-bold text-tema-titulos">Agenda Diaria</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleToday} className="px-3 py-1.5 text-xs font-semibold bg-tema-fondo border border-tema-borde rounded hover:bg-tema-codigo transition-colors mr-2">Hoy</button>
              <button onClick={handlePrevDay} className="p-1.5 bg-tema-fondo border border-tema-borde rounded hover:bg-tema-codigo transition-colors">◀</button>
              <div className="px-4 py-1.5 font-bold text-tema-acento min-w-[140px] text-center bg-tema-fondo border border-tema-borde rounded">
                {selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <button onClick={handleNextDay} className="p-1.5 bg-tema-fondo border border-tema-borde rounded hover:bg-tema-codigo transition-colors">▶</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loadingAppointments ? (
              <div className="flex justify-center items-center h-full text-tema-texto">Cargando agenda...</div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-full text-tema-texto italic opacity-70">
                <span className="text-4xl mb-2">📅</span>
                <p>No hay citas programadas en este centro para este día.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map(apt => {
                  const time = new Date(apt.appointment_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div 
                      key={apt.id} 
                      onClick={() => setSelectedAppointmentId(apt.id!)}
                      className="flex items-center p-4 bg-tema-fondo border border-tema-borde shadow-sm rounded-xl hover:border-tema-acento cursor-pointer transition-all hover:shadow-md"
                    >
                      <div className="w-20 border-r border-tema-borde pr-4 mr-4 text-center">
                        <span className="font-bold text-lg text-tema-titulos">{time}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-tema-titulos text-lg">{apt.patient_name}</p>
                        <p className="text-sm text-tema-texto">Importe: {(apt.amount / 100).toFixed(2)} €</p>
                      </div>
                      <div>
                        {apt.is_finished ? (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Terminada</span>
                        ) : apt.is_cancelled ? (
                          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Cancelada</span>
                        ) : (
                          <span className="bg-tema-codigo text-tema-titulos px-3 py-1 border border-tema-borde rounded-full text-xs font-bold">Pendiente</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de CREAR Nueva Cita */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-tema-fondo border border-tema-borde rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-tema-titulos">Agendar en {location.name}</h3>
              <button onClick={() => setShowNewAppointmentModal(false)} className="text-tema-texto hover:text-red-500 font-bold text-xl leading-none">&times;</button>
            </div>
            
            <AppointmentForm 
              fixedLocationId={location.id} 
              patientsList={patients}
              onSuccess={() => { setShowNewAppointmentModal(false); }}
              onCancel={() => setShowNewAppointmentModal(false)}
            />
          </div>
        </div>
      )}

      {selectedAppointmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          {/* Usamos max-w-3xl y un alto fijo para que parezca una ventana de gestión profunda */}
          <div className="bg-tema-fondo border border-tema-borde rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] overflow-hidden flex flex-col">
            <AppointmentManager 
              appointmentId={selectedAppointmentId}
              onActionComplete={() => setRefreshTrigger(prev => prev + 1)} // Forzamos recarga de la tabla trasera
              onClose={() => setSelectedAppointmentId(null)}
            />
          </div>
        </div>
      )}

    </div>
  );
};