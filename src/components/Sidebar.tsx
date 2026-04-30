import type { Location } from '../types.ts';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  locations: Location[];
  currentPath: string; // <-- Recibe la ruta actual de la URL
  navigate: (path: string) => void; // <-- Recibe la función para navegar
}

export const Sidebar = ({ isOpen, setIsOpen, locations, currentPath, navigate }: SidebarProps) => {
  
  // 1. HELPER ACTUALIZADO: Evalúa si la URL actual coincide con el botón
  const navItemClass = (pathName: string) => {
    // Iluminamos el botón si la ruta es exacta, o si estamos en el detalle de un paciente (/pacient/...) e iluminamos "/patients"
    const isActive = currentPath === pathName || (pathName === '/patients' && currentPath.startsWith('/pacient/'));
    
    return `
      block py-3 px-6 cursor-pointer transition-colors border-l-4 
      ${isActive 
        ? 'bg-tema-codigo border-tema-acento text-tema-titulos font-semibold' // ACTIVO
        : 'border-transparent hover:bg-tema-codigo hover:text-tema-titulos text-tema-texto' // INACTIVO
      }
    `;
  };

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
        
        {/* TÍTULO */}
        <div className="p-6 border-b border-tema-borde">
          <h1 className="text-2xl font-bold tracking-wide text-tema-acento">PsicoApp</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {/* Navegamos a las URLs en lugar de cambiar un estado string */}
          <a onClick={() => navigate('/')} className={navItemClass('/')}>🏠 Home / Dashboard</a>
          <a onClick={() => navigate('/patients')} className={navItemClass('/patients')}>👥 Pacientes</a>
          <a onClick={() => navigate('/calendar')} className={navItemClass('/calendar')}>📅 Calendario de Citas</a>
          
          {/* Sección de Centros */}
          <div className="py-2">
            <div className="px-6 py-2 text-xs font-bold text-tema-titulos opacity-70 uppercase tracking-wider">
              🏥 Mis Centros
            </div>
            
            {locations.length === 0 ? (
              <p className="px-10 text-sm text-tema-texto italic">No hay centros</p>
            ) : (
              locations.map(loc => {
                const locPath = `/loc/${loc.id}`;
                const isActive = currentPath === locPath;
                return (
                  <a 
                    key={loc.id} 
                    onClick={() => navigate(locPath)} 
                    className={`block py-2 pl-10 pr-6 text-sm cursor-pointer transition-colors ${
                      isActive 
                        ? 'text-tema-acento font-bold bg-tema-codigo border-l-4 border-tema-acento' 
                        : 'text-tema-texto hover:text-tema-titulos hover:bg-tema-codigo border-l-4 border-transparent'
                    }`}
                  >
                    📍 {loc.name}
                  </a>
                );
              })
            )}
          </div>

          {/* Sección Administración */}
          <div className="px-6 py-2 mt-4 text-xs font-bold text-tema-titulos opacity-70 uppercase tracking-wider">
            Administración
          </div>
          <a onClick={() => navigate('/billing')} className={navItemClass('/billing')}>💶 Facturación</a>
          <a onClick={() => navigate('/payment_methods')} className={navItemClass('/payment_methods')}>💳 Métodos de Pago</a>
          <a onClick={() => navigate('/locations')} className={navItemClass('/locations')}>📍 Localizaciones</a>
          <a onClick={() => navigate('/settings')} className={navItemClass('/settings')}>⚙️ Configuración</a>
        </nav>
      </aside>
    </>
  );
};