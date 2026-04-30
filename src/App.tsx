import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { initializeDatabase } from './database.ts';
import { Sidebar } from './components/Sidebar';
import { appointmentService } from './services/appointmentService';
import { analyticsService } from './services/analyticsService';
import { locationService } from './services/locationService';
import { patientService } from './services/patientService';
import { syncService } from './services/syncService'; // Nuevo servicio

import type { Appointment, Location, SyncData } from './types.ts';

// Importación de Vistas
import { LocationsManager } from './components/LocationsManager.tsx';
import { PaymentMethodsManager } from './components/PaymentMethodsManager.tsx';
import { PatientsManager } from './components/PatientsManager.tsx';
import { LocationDetail } from './components/LocationDetail.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { AppointmentManager } from './components/AppointmentManager.tsx';
import { BillingView } from './components/BillingView.tsx';
import { PatientsDetails } from './components/PatientsDetails.tsx';
import { SettingsView } from './components/SettingsView.tsx'; // Nueva vista

const getTodayRange = () => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

// Componente Home con Lógica de Aviso de Sincronización
const DashboardHome = ({
  todayAppointments,
  stats,
  syncData,
  setSelectedAppointmentId,
  loadDashboardData,
  navigate
}: any) => {

  // Lógica de validación del aviso (3 días o 20 cambios)
  const showSyncWarning = () => {
    if (!syncData) return true; // Mostrar si nunca se ha sincronizado
    const lastDate = new Date(syncData.last_update);
    const diffDays = (new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 3 || syncData.number_of_changes >= 20;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Buenos días</h2>
          <p className="text-gray-500">Aquí tienes el resumen de tu jornada de hoy.</p>
        </div>
        <button onClick={loadDashboardData} className="text-sm bg-white border border-gray-200 px-3 py-1.5 rounded shadow-sm hover:bg-gray-50">
          🔄 Actualizar
        </button>
      </div>

      {/* AVISO DINÁMICO DE SINCRONIZACIÓN */}
      {showSyncWarning() && (
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4 flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-amber-800 font-bold">Sincronización recomendada</p>
              <p className="text-amber-700 text-sm">
                {syncData?.number_of_changes || 0} cambios pendientes. No olvides respaldar tus datos en la nube.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            Sincronizar ahora
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500 font-medium">Citas Programadas Hoy</p>
          <p className="text-3xl font-bold mt-2">{todayAppointments.length - stats.cancelled}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
          <p className="text-sm text-gray-500 font-medium">Citas Terminadas</p>
          <p className="text-3xl font-bold mt-2">{stats.finished}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-500 font-medium">Ingresos Hoy (Estimado)</p>
          <p className="text-3xl font-bold mt-2">{stats.revenue.toFixed(2)} €</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-orange-500">
          <p className="text-sm text-gray-500 font-medium">Total Pacientes Activos</p>
          <p className="text-3xl font-bold mt-2">{stats.patients}</p>
        </div>
      </div>

      {/* Tabla de Citas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-700">Agenda del Día</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-gray-500 border-b border-gray-100">
                <th className="p-4 font-medium">Hora</th>
                <th className="p-4 font-medium">Paciente</th>
                <th className="p-4 font-medium">Centro</th>
                <th className="p-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {todayAppointments.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Día libre! 🎉</td></tr>
              ) : (
                todayAppointments.map((apt: Appointment) => {
                  const time = new Date(apt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={apt.id} onClick={() => setSelectedAppointmentId(apt.id!)} className="hover:bg-blue-50/50 transition-colors cursor-pointer">
                      <td className="p-4 font-semibold text-gray-700">{time}</td>
                      <td className="p-4 font-medium text-blue-600">{apt.patient_name || `Paciente #${apt.patient_id}`}</td>
                      <td className="p-4 text-sm text-gray-600">{apt.location_name || 'Sin asignar'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${apt.is_finished ? 'bg-green-100 text-green-700' : apt.is_cancelled ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {apt.is_finished ? 'Completada' : apt.is_cancelled ? 'Cancelada' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [locations, setLocations] = useState<Location[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ revenue: 0, patients: 0, finished: 0, cancelled: 0 });
  const [syncData, setSyncData] = useState<SyncData | null>(null); // Estado de Sync

  const navigate = useNavigate();
  const locationPath = useLocation();

  useEffect(() => {
    const setup = async () => {
      try {
        await initializeDatabase();
        setIsDbReady(true);
        await loadDashboardData();
      } catch (e) {
        console.error(e);
      }
    };
    setup();
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
    loadDashboardData();
  }, [locationPath.pathname, refreshTrigger]);

  const loadDashboardData = async () => {
    const { start, end } = getTodayRange();
    
    const [locs, apts, rev, fin, pats, sync] = await Promise.all([
      locationService.getAllActiveLocations(),
      appointmentService.getAppointmentsByDateRange(start, end),
      analyticsService.getTotalRevenue(start, end),
      analyticsService.getAppointmentCount(start, end, 'finished'),
      patientService.getAllActivePatients(),
      syncService.getSyncData() // Cargar datos de sync
    ]);

    setLocations(locs);
    setTodayAppointments(apts);
    setSyncData(sync);
    setStats({
      revenue: rev,
      patients: pats.length,
      finished: fin,
      cancelled: apts.filter(apt => apt.is_cancelled).length,
    });
  };

  if (!isDbReady) {
    return <div className="flex h-screen items-center justify-center bg-gray-50"><p className="animate-pulse text-gray-600">Iniciando sistema...</p></div>;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900 font-sans">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        locations={locations}
        currentPath={locationPath.pathname}
        navigate={navigate}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm md:hidden flex items-center justify-between p-4 z-30">
          <h2 className="text-lg font-semibold text-blue-600">PsicoApp</h2>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={
              <DashboardHome
                todayAppointments={todayAppointments}
                stats={stats}
                syncData={syncData}
                setSelectedAppointmentId={setSelectedAppointmentId}
                loadDashboardData={loadDashboardData}
                navigate={navigate}
              />
            } />
            <Route path="/patients" element={<PatientsManager />} />
            <Route path="/patient/:id" element={<PatientsDetails />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/locations" element={<LocationsManager />} />
            <Route path="/payment_methods" element={<PaymentMethodsManager />} />
            <Route path="/billing" element={<BillingView />} />
            <Route path="/settings" element={<SettingsView />} /> {/* Ruta de Sync */}
            <Route path="/loc/:idLocation" element={<LocationDetail />} />
          </Routes>
        </main>
      </div>

      {selectedAppointmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-tema-fondo border border-tema-borde rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] overflow-hidden flex flex-col">
            <AppointmentManager
              appointmentId={selectedAppointmentId}
              onActionComplete={() => setRefreshTrigger(prev => prev + 1)}
              onClose={() => setSelectedAppointmentId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;