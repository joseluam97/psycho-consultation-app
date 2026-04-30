import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { initializeDatabase } from './database.ts';
import { Sidebar } from './components/Sidebar';
import { appointmentService } from './services/appointmentService';
import { analyticsService } from './services/analyticsService';
import { locationService } from './services/locationService';
import { patientService } from './services/patientService';
import { driveService } from './services/driveService.ts';

import type { Appointment, Location } from './types.ts';

// Importación de Vistas
import { LocationsManager } from './components/LocationsManager.tsx';
import { PaymentMethodsManager } from './components/PaymentMethodsManager.tsx';
import { PatientsManager } from './components/PatientsManager.tsx';
import { LocationDetail } from './components/LocationDetail.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { AppointmentManager } from './components/AppointmentManager.tsx';
import { BillingView } from './components/BillingView.tsx';
import { PatientsDetails } from './components/PatientsDetails.tsx'; // <-- Tu nueva vista

// Helper de fechas
const getTodayRange = () => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

// Componente Home (El Dashboard principal de "Buenos días")
const DashboardHome = ({
  todayAppointments,
  stats,
  handleBackupToDrive,
  handleRestoreFromDrive,
  isSyncing,
  setSelectedAppointmentId,
  loadDashboardData
}: any) => (
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

    {/* PANEL VISUAL DE GOOGLE DRIVE */}
    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="font-bold text-blue-800 flex items-center gap-2">
          ☁️ Sincronización con Google Drive
        </h3>
        <p className="text-sm text-blue-600 mt-1">
          Mantén tus datos seguros y sincronizados entre tus dispositivos.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleBackupToDrive}
          disabled={isSyncing}
          className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isSyncing ? 'Sincronizando...' : '☁️ Forzar Sincronización'}
        </button>
        <button
          onClick={handleRestoreFromDrive}
          disabled={isSyncing}
          className="flex-1 sm:flex-none px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? 'Descargando...' : '📥 Actualizar desde Drive'}
        </button>
      </div>
    </div>

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

    {/* Tabla de Citas de Hoy */}
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
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">No tienes citas programadas para hoy. ¡Día libre! 🎉</td></tr>
            ) : (
              todayAppointments.map((apt: Appointment) => {
                const time = new Date(apt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <tr key={apt.id} onClick={() => setSelectedAppointmentId(apt.id!)} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 font-semibold text-gray-700">{time}</td>
                    <td className="p-4 font-medium text-blue-600 cursor-pointer">{apt.patient_name || `Paciente #${apt.patient_id}`}</td>
                    <td className="p-4 text-sm text-gray-600">{apt.location_name || 'Sin asignar'}</td>
                    <td className="p-4">
                      {apt.is_finished ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">Completada</span>
                      ) : apt.is_cancelled ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">Cancelada</span>
                      ) : (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">Pendiente</span>
                      )}
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

function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Estados para datos
  const [locations, setLocations] = useState<Location[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ revenue: 0, patients: 0, finished: 0, cancelled: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  const navigate = useNavigate();
  const locationPath = useLocation(); // Reemplaza al antiguo currentView

  useEffect(() => {
    const setup = async () => {
      try {
        await initializeDatabase();
        setIsDbReady(true);
        await loadDashboardData();
      } catch (e) {
        alert("Fallo crítico al iniciar la base de datos.");
      }
    };
    setup();
  }, []);

  useEffect(() => {
    // Cerramos el sidebar en móvil al cambiar de ruta
    setIsSidebarOpen(false);

    // Si la ruta es la raíz (/), recargamos los datos del dashboard
    if (locationPath.pathname === '/') {
      loadDashboardData();
    }
  }, [locationPath.pathname, refreshTrigger]);

  const loadDashboardData = async () => {
    const { start, end } = getTodayRange();
    const locs = await locationService.getAllActiveLocations();
    setLocations(locs);
    const appointments = await appointmentService.getAppointmentsByDateRange(start, end);
    setTodayAppointments(appointments);
    const revenue = await analyticsService.getTotalRevenue(start, end);
    const finishedCount = await analyticsService.getAppointmentCount(start, end, 'finished');
    const patientsList = await patientService.getAllActivePatients();

    setStats({
      revenue,
      patients: patientsList.length,
      finished: finishedCount,
      cancelled: appointments.filter(apt => apt.is_cancelled).length,
    });
  };

  const handleBackupToDrive = async () => {
    setIsSyncing(true);
    try {
      await driveService.uploadDatabase();
      alert("✅ Copia de seguridad subida correctamente a Google Drive.");
    } catch (error) {
      alert("❌ Error al subir la copia de seguridad.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (window.confirm("⚠️ ATENCIÓN: Esto borrará todos los datos actuales. ¿Estás seguro?")) {
      setIsSyncing(true);
      try {
        await driveService.downloadDatabase();
        alert("✅ Base de datos restaurada. La aplicación se reiniciará.");
        window.location.reload();
      } catch (error) {
        alert("❌ Error al restaurar la base de datos.");
        setIsSyncing(false);
      }
    }
  };

  if (!isDbReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="animate-pulse text-gray-600">Conectando base de datos...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900 font-sans">

      {/* Sidebar ahora usa React Router internamente */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        locations={locations}
        // Pasamos pathname para que el Sidebar sepa qué botón iluminar
        currentPath={locationPath.pathname}
        navigate={navigate}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Móvil */}
        <header className="bg-white shadow-sm md:hidden flex items-center justify-between p-4 z-30">
          <h2 className="text-lg font-semibold text-blue-600">PsicoApp</h2>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Sistema de Rutas (Reemplaza al renderizado condicional antiguo) */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={
              <DashboardHome
                todayAppointments={todayAppointments}
                stats={stats}
                handleBackupToDrive={handleBackupToDrive}
                handleRestoreFromDrive={handleRestoreFromDrive}
                isSyncing={isSyncing}
                setSelectedAppointmentId={setSelectedAppointmentId}
                loadDashboardData={loadDashboardData}
              />
            } />

            <Route path="/patients" element={<PatientsManager />} />
            <Route path="/patient/:id" element={<PatientsDetails />} />

            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/locations" element={<LocationsManager />} />
            <Route path="/payment_methods" element={<PaymentMethodsManager />} />
            <Route path="/billing" element={<BillingView />} />

            {/* Rutas dinámicas para cada centro */}
            <Route path="/loc/:idLocation" element={<LocationDetail />} />

          </Routes>
        </main>
      </div>

      {/* Modal de Citas (Se mantiene global) */}
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