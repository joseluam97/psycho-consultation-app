import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientService } from '../services/patientService';
import { locationService } from '../services/locationService';
import { appointmentService } from '../services/appointmentService';
import { noteService } from '../services/noteService';
import { paymentMethodService } from '../services/paymentMethodService';
import type { Patient, Location, Appointment, Note, PaymentMethod } from '../types';

export const PatientsDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const patientId = Number(id);
        const patientData = await patientService.getPatientById(patientId);
        setPatient(patientData);

        if (patientData) {
          const [locs, apts, nts, methods] = await Promise.all([
            locationService.getAllActiveLocations(),
            appointmentService.getActiveAppointmentsByPatient(patientId),
            noteService.getActiveNotesByPatient(patientId),
            paymentMethodService.getAllActivePaymentMethods()
          ]);

          const defaultLoc = locs.find(l => l.id === patientData.default_location_id);
          setLocation(defaultLoc || null);
          setAppointments(apts);
          setNotes(nts);
          setPaymentMethods(methods);
        }
      } catch (error) {
        console.error("Error cargando detalles del paciente:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientData();
  }, [id]);

  const getPaymentMethodName = (paymentId: number | null | undefined) => {
    if (!paymentId) return '-';
    return paymentMethods.find(pm => pm.id === paymentId)?.name || 'Desconocido';
  };

  const cancelledCount = appointments.filter(a => a.is_cancelled).length;
  const finishedCount = appointments.filter(a => a.is_finished).length;
  const historicalTotal = cancelledCount + finishedCount;
  const cancelRate = historicalTotal > 0 ? (cancelledCount / historicalTotal) * 100 : 0;

  if (isLoading) {
    return <div className="p-10 text-center font-medium text-gray-500">Cargando expediente...</div>;
  }

  if (!patient) {
    return (
      <div className="p-10 text-center text-red-500 font-bold">
        Paciente no encontrado. <button onClick={() => navigate(-1)} className="underline">Volver</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 flex flex-col space-y-6 animate-fade-in">
      
      {/* 1. NAVEGACIÓN SUPERIOR */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span className="text-xl leading-none">←</span> Volver
        </button>
      </div>

      {/* 2. SISTEMA DE ALERTAS (WARNING / CAUTION) */}
      {cancelRate > 40 ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-bold text-red-800">CAUTION: Alta tasa de cancelación</h4>
            <p className="text-sm text-red-700">Este paciente ha cancelado el <strong>{cancelRate.toFixed(1)}%</strong> de sus citas históricas.</p>
          </div>
        </div>
      ) : cancelRate > 25 ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <h4 className="font-bold text-amber-800">WARNING: Frecuentes cancelaciones</h4>
            <p className="text-sm text-amber-700">Este paciente ha cancelado el <strong>{cancelRate.toFixed(1)}%</strong> de sus citas históricas.</p>
          </div>
        </div>
      ) : null}

      {/* 3. TARJETA DE INFORMACIÓN DEL PACIENTE */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start">
        
        <div className="space-y-4 flex-1">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-black text-gray-800">{patient.name}</h2>
              {/* INDICADOR DE PAREJA[cite: 14] */}
              {patient.is_couple == true && (
                <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-purple-200">
                  PAREJA
                </span>
              )}
              {patient.is_couple == false && (
                <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-purple-200">
                  INDIVIDUAL
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-bold uppercase">Nacimiento</span>
              <span className="font-semibold text-gray-700">
                {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('es-ES') : 'N/A'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-bold uppercase">Teléfono</span>
              <span className="font-semibold text-gray-700">{patient.phone || 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-bold uppercase">Ubicación</span>
              <span className="font-semibold text-gray-700">{location?.name || 'N/A'}</span>
            </div>
            {/* INFORMACIÓN DE FIANZA[cite: 14] */}
            <div className="flex flex-col">
              <span className="text-xs text-emerald-500 font-bold uppercase">Fianza</span>
              <span className="font-black text-emerald-600">
                {((patient as any).bail_amount / 100 || 0).toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 shrink-0">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center min-w-[100px]">
            <span className="block text-3xl font-black text-emerald-600">{finishedCount}</span>
            <span className="text-xs font-bold text-emerald-800 uppercase">Finalizadas</span>
          </div>
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center min-w-[100px]">
            <span className="block text-3xl font-black text-red-600">{cancelledCount}</span>
            <span className="text-xs font-bold text-red-800 uppercase">Canceladas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Historial de Citas</h3>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{appointments.length} Citas</span>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-gray-400 text-xs border-b border-gray-200 uppercase">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3 text-center">Pago</th>
                  <th className="px-4 py-3 text-right">Vuelta</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No hay historial.</td></tr>
                ) : (
                  [...appointments].sort((a, b) => new Date(b.appointment_datetime).getTime() - new Date(a.appointment_datetime).getTime()).map(apt => (
                    <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {new Date(apt.appointment_datetime).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-700">
                        {((apt.amount || 0) / 100).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {getPaymentMethodName(apt.payment_method_id)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 font-medium">
                        {(apt.return_amount && apt.return_amount > 0) ? `${(apt.return_amount / 100).toFixed(2)} €` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {apt.is_finished ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Finalizada</span>
                        ) : apt.is_cancelled ? (
                          <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full uppercase">Cancelada</span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase">Pendiente</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col max-h-[600px]">
          <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-gray-800">Notas Clínicas</h3>
            <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">{notes.length}</span>
          </div>
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {notes.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm italic">Sin notas clínicas.</div>
            ) : (
              notes.map(note => (
                <div key={note.id} className="bg-yellow-50/30 border border-yellow-100 p-3 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-yellow-700 uppercase">
                      {new Date(note.note_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};