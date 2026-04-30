import { useState, useEffect, useRef } from 'react';
import { appointmentService } from '../services/appointmentService';
import { locationService } from '../services/locationService';
import { AppointmentForm } from './AppointmentForm.tsx';
import { AppointmentManager } from './AppointmentManager';
import type { Appointment, Location } from '../types.ts';

const LOCATION_COLORS = [
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-emerald-100 border-emerald-400 text-emerald-800',
  'bg-purple-100 border-purple-400 text-purple-800',
  'bg-amber-100 border-amber-400 text-amber-800',
  'bg-rose-100 border-rose-400 text-rose-800',
];

const TIME_RANGES = {
  all: { start: 8, end: 21, label: 'Todo el día' },
  morning: { start: 8, end: 15, label: 'Mañanas (08-15h)' },
  afternoon: { start: 15, end: 21, label: 'Tardes (15-21h)' }
};

type TimeFilterType = keyof typeof TIME_RANGES;

export const CalendarView = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [visibleLocationIds, setVisibleLocationIds] = useState<Set<number>>(new Set());
  
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const isInitialLoad = useRef(true);
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const activeStartHour = TIME_RANGES[timeFilter].start;
  const activeEndHour = TIME_RANGES[timeFilter].end;
  const hours = Array.from({ length: activeEndHour - activeStartHour + 1 }, (_, i) => i + activeStartHour);

  useEffect(() => {
    const loadData = async () => {
      const locs = await locationService.getAllActiveLocations();
      setLocations(locs);
      
      if (visibleLocationIds.size === 0 && locs.length > 0) {
        setVisibleLocationIds(new Set(locs.map(l => l.id!)));
      }

      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 4);
      weekEnd.setHours(23, 59, 59, 999);

      const apts = await appointmentService.getAppointmentsByDateRange(
        currentWeekStart.toISOString(),
        weekEnd.toISOString()
      );
      
      setAppointments(apts);

      if (isInitialLoad.current) {
        const hasMorningAppointments = apts.some(a => {
          const h = new Date(a.appointment_datetime).getHours();
          return h >= 8 && h < 15;
        });

        if (!hasMorningAppointments) {
          setTimeFilter('afternoon');
        }
        isInitialLoad.current = false;
      }
    };
    loadData();
  }, [currentWeekStart, refreshTrigger]);

  const toggleLocation = (id: number) => {
    const newSet = new Set(visibleLocationIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setVisibleLocationIds(newSet);
  };

  const getWeekDays = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays();

  const visibleAppointments = appointments.filter(a => 
    a.location_id && visibleLocationIds.has(a.location_id)
  );

  return (
    // CAMBIO 1: Eliminamos 'h-[calc(100vh-6rem)]' y añadimos 'pb-8' para que tenga margen por abajo al scrollear
    <div className="max-w-7xl mx-auto pb-8 flex flex-col space-y-4">
      
      {/* 1. Barra de Controles */}
      <div className="bg-tema-fondo p-4 rounded-xl border border-tema-borde shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); }}
            className="p-2 bg-tema-codigo border border-tema-borde rounded hover:bg-tema-fondo transition-colors"
          >◀ Ant.</button>
          <div className="px-4 py-2 font-bold text-tema-titulos text-center bg-tema-codigo border border-tema-borde rounded min-w-[200px]">
            {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {weekDays[4].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <button 
            onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); }}
            className="p-2 bg-tema-codigo border border-tema-borde rounded hover:bg-tema-fondo transition-colors"
          >Sig. ▶</button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex bg-tema-codigo rounded-lg p-1 border border-tema-borde shadow-sm">
            {(Object.keys(TIME_RANGES) as TimeFilterType[]).map((key) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  timeFilter === key 
                    ? 'bg-tema-acento text-white shadow' 
                    : 'text-tema-texto hover:bg-tema-fondo'
                }`}
              >
                {TIME_RANGES[key].label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            {locations.map((loc, index) => {
              const isActive = visibleLocationIds.has(loc.id!);
              const colorClass = LOCATION_COLORS[index % LOCATION_COLORS.length];
              return (
                <button
                  key={loc.id}
                  onClick={() => toggleLocation(loc.id!)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isActive ? colorClass : 'bg-transparent border-tema-borde text-tema-texto opacity-50'
                  }`}
                >
                  {isActive ? '✓ ' : ''}{loc.name}
                </button>
              );
            })}
          </div>
        </div>

        <button 
          onClick={() => setShowNewModal(true)}
          className="bg-tema-acento text-white px-5 py-2 rounded-lg font-bold shadow-sm hover:opacity-90 whitespace-nowrap"
        >
          + Nueva Cita
        </button>
      </div>

      {/* 2. Cuadrícula del Calendario */}
      {/* CAMBIO 2: Quitamos 'flex-1' del contenedor general de la cuadrícula para que no restrinja el tamaño */}
      <div className="bg-tema-fondo rounded-xl border border-tema-borde shadow-sm overflow-hidden flex flex-col">
        
        {/* Cabecera de Días */}
        <div className="flex border-b border-tema-borde bg-tema-codigo/50">
          <div className="w-16 flex-shrink-0 border-r border-tema-borde"></div>
          {weekDays.map((date, i) => (
            <div key={i} className="flex-1 text-center py-3 border-r border-tema-borde last:border-r-0">
              <p className="text-xs font-bold text-tema-texto uppercase tracking-wider">
                {date.toLocaleDateString('es-ES', { weekday: 'short' })}
              </p>
              <p className={`text-lg font-bold mt-1 ${
                date.toDateString() === new Date().toDateString() ? 'text-tema-acento' : 'text-tema-titulos'
              }`}>
                {date.getDate()}
              </p>
            </div>
          ))}
        </div>

        {/* Grid de Contenido */}
        {/* CAMBIO 3: Quitamos 'overflow-y-auto' y 'flex-1' de aquí. Ahora el grid expande libremente hacia abajo */}
        <div className="flex relative bg-tema-fondo">
          
          {/* Columna Horas */}
          <div className="w-16 flex-shrink-0 border-r border-tema-borde bg-tema-fondo relative z-10">
            {hours.map(hour => (
              <div key={hour} className="h-20 border-b border-tema-borde relative">
                <span className="absolute -top-3 right-2 text-xs font-bold text-tema-texto bg-tema-fondo px-1">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Columnas de Días */}
          <div className="flex-1 flex relative">
            <div className="absolute inset-0 pointer-events-none flex flex-col">
              {hours.map(hour => (
                <div key={hour} className="h-20 border-b border-tema-borde/50"></div>
              ))}
            </div>

            {weekDays.map((date, dayIndex) => {
              const dayAppointments = visibleAppointments.filter(a => {
                const aDate = new Date(a.appointment_datetime);
                const hour = aDate.getHours();
                return (
                  aDate.toDateString() === date.toDateString() &&
                  hour >= activeStartHour && 
                  hour < activeEndHour
                );
              });

              return (
                <div key={dayIndex} className="flex-1 border-r border-tema-borde/50 last:border-r-0 relative">
                  {dayAppointments.map(apt => {
                    const aptDate = new Date(apt.appointment_datetime);
                    const hoursPassed = aptDate.getHours() - activeStartHour;
                    const minutesPassed = aptDate.getMinutes();
                    
                    const topPosition = (hoursPassed * 80) + ((minutesPassed / 60) * 80);
                    
                    const locIndex = locations.findIndex(l => l.id === apt.location_id);
                    const colorClass = LOCATION_COLORS[locIndex % LOCATION_COLORS.length] || LOCATION_COLORS[0];

                    return (
                      <div 
                        key={apt.id}
                        onClick={() => setSelectedAppointmentId(apt.id!)}
                        className={`absolute left-1 right-1 h-16 rounded-md border-l-4 p-2 cursor-pointer hover:shadow-md transition-all overflow-hidden z-20 ${colorClass} ${apt.is_finished ? 'opacity-50' : ''}`}
                        style={{ top: `${topPosition}px` }}
                      >
                        <p className="text-xs font-bold truncate">{aptDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-sm font-semibold truncate leading-tight mt-0.5">{apt.patient_name}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modales */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-tema-fondo border border-tema-borde rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-tema-titulos">Nueva Cita</h3>
              <button onClick={() => setShowNewModal(false)} className="text-tema-texto hover:text-red-500 font-bold text-xl leading-none">&times;</button>
            </div>
            
            <AppointmentForm 
              onSuccess={() => { setShowNewModal(false); setRefreshTrigger(prev => prev + 1); }}
              onCancel={() => setShowNewModal(false)}
            />
          </div>
        </div>
      )}

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
};