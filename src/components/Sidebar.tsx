import type { Location } from '../types.ts';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  locations: Location[];
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Sidebar = ({ isOpen, setIsOpen, locations, currentView, setCurrentView }: SidebarProps) => {
  
  // 1. HELPER ACTUALIZADO: Usamos tus variables de tema para el contraste
  const navItemClass = (viewName: string) => `
    block py-3 px-6 cursor-pointer transition-colors border-l-4 
    ${currentView === viewName 
      ? 'bg-tema-codigo border-tema-acento text-tema-titulos font-semibold' // ACTIVO: Fondo sutil, borde de acento, texto fuerte
      : 'border-transparent hover:bg-tema-codigo hover:text-tema-titulos text-tema-texto' // INACTIVO: Texto normal, al pasar el ratón se ilumina
    }
  `;

  return (
    <>
      {/* Overlay oscuro para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menú Lateral */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-tema-fondo text-tema-texto border-r border-tema-borde transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        
        {/* 2. TÍTULO ACTUALIZADO */}
        <div className="p-6 border-b border-tema-borde">
          {/* He usado el color de tu acento (--accent) para el título */}
          <h1 className="text-2xl font-bold tracking-wide text-tema-acento">PsicoApp</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          <a onClick={() => setCurrentView('home')} className={navItemClass('home')}>🏠 Home / Dashboard</a>
          <a onClick={() => setCurrentView('patients')} className={navItemClass('patients')}>👥 Pacientes</a>
          <a onClick={() => setCurrentView('calendar')} className={navItemClass('calendar')}>📅 Calendario de Citas</a>
          
          {/* Sección de Centros */}
          <div className="py-2">
            {/* 3. CABECERAS DE SECCIÓN ACTUALIZADAS */}
            <div className="px-6 py-2 text-xs font-bold text-tema-titulos opacity-70 uppercase tracking-wider">
              🏥 Mis Centros
            </div>
            
            {locations.length === 0 ? (
              <p className="px-10 text-sm text-tema-texto italic">No hay centros</p>
            ) : (
              locations.map(loc => (
                <a key={loc.id} onClick={() => setCurrentView(`loc_${loc.id}`)} className="block py-2 pl-10 pr-6 text-sm text-tema-texto hover:text-tema-titulos hover:bg-tema-codigo cursor-pointer">
                  📍 {loc.name}
                </a>
              ))
            )}
          </div>

          {/* 3. CABECERAS DE SECCIÓN ACTUALIZADAS */}
          <div className="px-6 py-2 mt-4 text-xs font-bold text-tema-titulos opacity-70 uppercase tracking-wider">
            Administración
          </div>
          <a onClick={() => setCurrentView('billing')} className={navItemClass('billing')}>💶 Facturación</a>
          <a onClick={() => setCurrentView('payment_methods')} className={navItemClass('payment_methods')}>💳 Métodos de Pago</a>
          <a onClick={() => setCurrentView('locations')} className={navItemClass('locations')}>📍 Localizaciones</a>
        </nav>
      </aside>
    </>
  );
};