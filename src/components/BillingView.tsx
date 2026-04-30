import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { appointmentService } from '../services/appointmentService';
import { locationService } from '../services/locationService';
import { paymentMethodService } from '../services/paymentMethodService';
import type { Appointment, Location, PaymentMethod } from '../types';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardMetrics {
  totalRevenue: number;
  totalToReceive: number;
  netIncome: number;
  totalSessions: number;
  uniquePatients: number;
  cancelledCount: number;
  deletedCount: number;
  averageTicket: number;
  recurrentPatients: number;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const BillingView = () => {
  const now = new Date();

  // 1. Estados de Datos
  const [locations, setLocations] = useState<Location[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | 'all'>('all');

  // 2. Estados de Navegación y Modos
  const [mode, setMode] = useState<'month' | 'free'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  );

  const [irpfPercentage, setIrpfPercentage] = useState<number>(15);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 3. Estados para el Modal de Exportación PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfConfig, setPdfConfig] = useState({
    locationId: 'all' as number | 'all',
    includeBilling: true,
    includeStats: true,
    includeList: true
  });

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0, totalToReceive: 0, netIncome: 0, totalSessions: 0,
    uniquePatients: 0, cancelledCount: 0, deletedCount: 0, averageTicket: 0, recurrentPatients: 0
  });

  useEffect(() => {
    const initData = async () => {
      const locs = await locationService.getAllActiveLocations();
      const methods = await paymentMethodService.getAllActivePaymentMethods();
      setLocations(locs);
      setPaymentMethods(methods);
    };
    initData();
  }, []);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(prev => prev - 1); } 
    else { setSelectedMonth(prev => prev - 1); }
  };
  const handleNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(prev => prev + 1); } 
    else { setSelectedMonth(prev => prev + 1); }
  };

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      let startQuery = "";
      let endQuery = "";

      if (mode === 'month') {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        startQuery = `${selectedYear}-${pad(selectedMonth + 1)}-01T00:00:00`;
        endQuery = `${selectedYear}-${pad(selectedMonth + 1)}-${pad(lastDayOfMonth)}T23:59:59`;
      } else {
        if (!customStartDate || !customEndDate) { setIsLoading(false); return; }
        startQuery = `${customStartDate}T00:00:00`;
        endQuery = `${customEndDate}T23:59:59`;
      }

      const locFilter = selectedLocationId === 'all' ? undefined : selectedLocationId;

      const [
        totalRevenue, totalSessions, cancelledCount, uniquePatients, deletedCount,
        revenueByLocation, averageTicket, recurrentPatients, apts
      ] = await Promise.all([
        analyticsService.getTotalRevenue(startQuery, endQuery, locFilter),
        analyticsService.getAppointmentCount(startQuery, endQuery, 'finished', locFilter),
        analyticsService.getAppointmentCount(startQuery, endQuery, 'cancelled', locFilter),
        analyticsService.getUniquePatientsCount(startQuery, endQuery, locFilter),
        analyticsService.getDeletedAppointmentsCount(startQuery, endQuery, locFilter),
        analyticsService.getRevenueByLocation(startQuery, endQuery),
        analyticsService.getAverageIncomePerSession(startQuery, endQuery, locFilter),
        analyticsService.getRecurrentPatientsCount(startQuery, endQuery, locFilter),
        appointmentService.getAppointmentsByDateRange(startQuery, endQuery)
      ]);

      setAllAppointments(apts);

      let toReceive = 0;
      revenueByLocation.forEach((loc: any) => {
        if (selectedLocationId === 'all' || loc.id === selectedLocationId) {
          const revenueEuros = loc.total_cents / 100;
          const deductionPercent = loc.percentage_deducted || 0;
          const deductionAmount = revenueEuros * (deductionPercent / 100);
          toReceive += (revenueEuros - deductionAmount);
        }
      });

      if (selectedLocationId === 'all') {
        const revenueWithLocation = revenueByLocation.reduce((acc: number, loc: any) => acc + (loc.total_cents / 100), 0);
        const missingRevenue = totalRevenue - revenueWithLocation;
        toReceive += missingRevenue;
      }

      const netIncome = toReceive - (toReceive * (irpfPercentage / 100));

      setMetrics({
        totalRevenue, totalToReceive: toReceive, netIncome, totalSessions,
        uniquePatients, cancelledCount, deletedCount, averageTicket, recurrentPatients
      });

    } catch (error) {
      console.error("Error al cargar las analíticas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [mode, selectedMonth, selectedYear, customStartDate, customEndDate, irpfPercentage, selectedLocationId]);

  const getPaymentMethodName = (id: number | null | undefined) => {
    if (!id) return '-';
    return paymentMethods.find(pm => pm.id === id)?.name || 'Desconocido';
  };

  const filteredTable = allAppointments.filter(a => {
    if (a.is_finished !== 1) return false;
    if (selectedLocationId !== 'all' && a.location_id !== selectedLocationId) return false;
    return true;
  });

  // --- LÓGICA DE EXPORTACIÓN A PDF ---
  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    
    // Título y Configuración Inicial
    const locationName = pdfConfig.locationId === 'all' 
      ? 'Todas las ubicaciones' 
      : locations.find(l => l.id === pdfConfig.locationId)?.name || 'Ubicación';
      
    const dateRange = mode === 'month' 
      ? `${MONTHS[selectedMonth]} ${selectedYear}`
      : `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`;

    doc.setFontSize(18);
    doc.text('Informe de Facturación y Sesiones', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Centro: ${locationName}`, 14, 28);
    doc.text(`Periodo: ${dateRange}`, 14, 34);

    let currentY = 45;

    // --- CÁLCULOS EXCLUSIVOS PARA EL PDF ---
    const pdfApts = allAppointments.filter(a => a.is_finished === 1 && (pdfConfig.locationId === 'all' || a.location_id === pdfConfig.locationId));
    
    const pdfTotalSessions = pdfApts.length;
    const pdfTotalRev = pdfApts.reduce((acc, a) => acc + (a.amount || 0), 0) / 100;
    
    let toReceiveCents = 0;
    const patientVisits: Record<number, number> = {};
    
    pdfApts.forEach(apt => {
        // Cálculo para "Total a Percibir"
        const loc = locations.find(l => l.id === apt.location_id);
        const percent = loc?.percentage_deducted || 0;
        const rev = apt.amount || 0;
        toReceiveCents += rev - (rev * (percent / 100));
        
        // Conteo para Pacientes Únicos y Recurrentes
        patientVisits[apt.patient_id] = (patientVisits[apt.patient_id] || 0) + 1;
    });
    
    const pdfTotalToReceive = toReceiveCents / 100;
    const pdfNetIncome = pdfTotalToReceive - (pdfTotalToReceive * (irpfPercentage / 100));
    
    const pdfUniquePatients = Object.keys(patientVisits).length;
    const pdfRecurrentPatients = Object.values(patientVisits).filter(v => v > 1).length;
    const pdfAverageTicket = pdfTotalSessions > 0 ? pdfTotalRev / pdfTotalSessions : 0;

    // 1. Datos de Facturación
    if (pdfConfig.includeBilling) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Datos de facturación', 14, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        head: [['Concepto', 'Importe / Porcentaje']],
        body: [
          ['Total Recaudado (Bruto)', `${pdfTotalRev.toFixed(2)} €`],
          ['Total a Percibir', `${pdfTotalToReceive.toFixed(2)} €`],
          ['Total a Cobrar (Neto)', `${pdfNetIncome.toFixed(2)} €`],
          ['IRPF', `${irpfPercentage}%`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }, // Azul
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 2. Estadísticas y Totales
    if (pdfConfig.includeStats) {
      if (currentY > 250) { doc.addPage(); currentY = 20; } // Salto de página si no cabe
      
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Estadísticas y totales', 14, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        head: [['Métrica', 'Valor']],
        body: [
          ['Sesiones', `${pdfTotalSessions}`],
          ['Pacientes Únicos', `${pdfUniquePatients}`],
          ['Ticket Medio', `${pdfAverageTicket.toFixed(2)} €`],
          ['Recurrentes', `${pdfRecurrentPatients}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [142, 68, 173] }, // Morado
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 3. Listado de Sesiones Finalizadas
    if (pdfConfig.includeList) {
      if (currentY > 240) { doc.addPage(); currentY = 20; } // Salto de página si no cabe
      
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Listado de sesiones finalizadas', 14, currentY);
      currentY += 8;

      const tableData = pdfApts.map(apt => {
        const dateStr = new Date(apt.appointment_datetime).toLocaleDateString('es-ES');
        const amountStr = `${((apt.amount || 0) / 100).toFixed(2)} €`;
        const methodStr = getPaymentMethodName(apt.payment_method_id);
        const returnStr = (apt.return_amount && apt.return_amount > 0) ? `${(apt.return_amount / 100).toFixed(2)} €` : '-';
        
        return [
          apt.patient_name || 'Paciente Desconocido', 
          dateStr, 
          amountStr, 
          methodStr, 
          returnStr
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Nombre', 'Fecha', 'Importe', 'Método de Pago', 'Vuelta']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96] }, // Verde estilo Excel
        margin: { left: 14, right: 14 }
      });
    }

    // Guardar el archivo PDF
    const fileName = `Informe_${locationName.replace(/\s+/g, '_')}_${dateRange.replace(/\s+/g, '')}.pdf`;
    doc.save(fileName);
    setShowPdfModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto pb-8 flex flex-col space-y-6">
      
      {/* BARRA DE FILTROS SUPERIOR */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-100 pb-4 gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
            <button onClick={() => setMode('month')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${mode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Mes a Mes</button>
            <button onClick={() => setMode('free')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${mode === 'free' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Fechas Libres</button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
              <label className="text-sm font-bold text-blue-800">IRPF (%):</label>
              <input type="number" min="0" max="100" value={irpfPercentage} onChange={(e) => setIrpfPercentage(Number(e.target.value))} className="w-16 border border-blue-200 rounded-md p-1 text-center font-bold text-blue-900 bg-white" />
            </div>

            {/* BOTÓN EXPORTAR */}
            <button 
              onClick={() => setShowPdfModal(true)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              📄 Exportar a PDF
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          {mode === 'month' ? (
            <div className="flex items-center gap-3">
              <button onClick={handlePrevMonth} className="p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors">◀</button>
              <div className="flex gap-2">
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 bg-white">
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 bg-white">
                  {[now.getFullYear() - 1, now.getFullYear()].map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <button onClick={handleNextMonth} className="p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors">▶</button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-600">Desde:</label>
                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <span className="text-gray-400 hidden sm:block">-</span>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-600">Hasta:</label>
                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-gray-400 font-medium">Calculando métricas...</div>
      ) : (
        <>
          {/* PESTAÑAS DE LOCALIZACIÓN */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-gray-200">
            <button onClick={() => setSelectedLocationId('all')} className={`px-5 py-2.5 rounded-t-xl font-bold whitespace-nowrap transition-all border-2 border-b-0 ${selectedLocationId === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
              Todas las ubicaciones
            </button>
            {locations.map(loc => (
              <button key={loc.id} onClick={() => setSelectedLocationId(loc.id!)} className={`px-5 py-2.5 rounded-t-xl font-bold whitespace-nowrap transition-all border-2 border-b-0 ${selectedLocationId === loc.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                {loc.name}
              </button>
            ))}
          </div>

          {/* TARJETAS PRINCIPALES (INGRESOS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-400"></div>
              <h3 className="text-gray-500 font-semibold mb-1">Total Recaudado (Bruto)</h3>
              <p className="text-4xl font-black text-gray-800">{metrics.totalRevenue.toFixed(2)} €</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
              <h3 className="text-gray-500 font-semibold mb-1">Total a Percibir</h3>
              <p className="text-4xl font-black text-blue-600">{metrics.totalToReceive.toFixed(2)} €</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-md flex flex-col justify-center items-center relative overflow-hidden bg-emerald-50/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              <h3 className="text-emerald-700 font-bold mb-1">Total a Cobrar (Neto)</h3>
              <p className="text-5xl font-black text-emerald-600">{metrics.netIncome.toFixed(2)} €</p>
            </div>
          </div>

          {/* GRID SECUNDARIO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Sesiones" value={metrics.totalSessions} color="indigo" />
            <MetricCard title="Pacientes Únicos" value={metrics.uniquePatients} color="indigo" />
            <MetricCard title="Ticket Medio" value={`${metrics.averageTicket.toFixed(2)} €`} color="amber" />
            <MetricCard title="Recurrentes" value={metrics.recurrentPatients} color="amber" />
          </div>

          {/* TABLA DE CITAS FINALIZADAS */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-700">Listado de sesiones finalizadas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-100 text-gray-600 uppercase font-bold text-xs border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3 text-center">Fecha</th>
                    <th className="px-4 py-3 text-right">Importe</th>
                    <th className="px-4 py-3 text-center">Método de pago</th>
                    <th className="px-4 py-3 text-right">Vuelta</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTable.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 font-medium">
                        No hay citas finalizadas en este periodo para la ubicación seleccionada.
                      </td>
                    </tr>
                  ) : (
                    filteredTable.map((apt) => {
                      const dateObj = new Date(apt.appointment_datetime);
                      const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      return (
                        <tr key={apt.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-800">{apt.patient_name}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{dateStr}</td>
                          <td className="px-4 py-3 text-right font-medium">{((apt.amount || 0) / 100).toFixed(2)} €</td>
                          <td className="px-4 py-3 text-center text-gray-600">{getPaymentMethodName(apt.payment_method_id)}</td>
                          <td className="px-4 py-3 text-right text-gray-600 font-medium">{(apt.return_amount && apt.return_amount > 0) ? `${(apt.return_amount / 100).toFixed(2)} €` : '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- MODAL DE EXPORTACIÓN PDF --- */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h3 className="text-xl font-black text-gray-800 mb-4">Configurar Informe PDF</h3>
            
            <div className="space-y-5">
              {/* Filtro de Centro */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Ubicación:</label>
                <select 
                  value={pdfConfig.locationId}
                  onChange={(e) => setPdfConfig({...pdfConfig, locationId: e.target.value === 'all' ? 'all' : Number(e.target.value)})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-gray-50 text-gray-800 font-medium"
                >
                  <option value="all">Todas las ubicaciones</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Qué incluir en el PDF */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Contenido a incluir:</label>
                <div className="flex flex-col gap-3">
                  
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input 
                      type="checkbox" 
                      checked={pdfConfig.includeBilling}
                      onChange={(e) => setPdfConfig({...pdfConfig, includeBilling: e.target.checked})}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="font-semibold text-gray-700">Datos de facturación</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input 
                      type="checkbox" 
                      checked={pdfConfig.includeStats}
                      onChange={(e) => setPdfConfig({...pdfConfig, includeStats: e.target.checked})}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="font-semibold text-gray-700">Estadísticas y totales</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input 
                      type="checkbox" 
                      checked={pdfConfig.includeList}
                      onChange={(e) => setPdfConfig({...pdfConfig, includeList: e.target.checked})}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="font-semibold text-gray-700">Listado de sesiones finalizadas</span>
                  </label>

                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGeneratePDF}
                disabled={!pdfConfig.includeBilling && !pdfConfig.includeStats && !pdfConfig.includeList}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                📄 Generar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, color }: { title: string, value: string | number, color: 'indigo' | 'amber' }) => {
  const colorMap = { indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100', amber: 'text-amber-600 bg-amber-50 border-amber-100' };
  return (
    <div className={`p-4 rounded-xl border flex flex-col justify-center items-center text-center ${colorMap[color]}`}>
      <h4 className="text-sm font-bold opacity-80 mb-1">{title}</h4>
      <span className="text-2xl font-black">{value}</span>
    </div>
  );
};