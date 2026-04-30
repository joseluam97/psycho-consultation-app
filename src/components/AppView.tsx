import { useState } from 'react';

export default function AppView({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Sidebar (Navegación) - Oculto en móvil, visible en Chromebook */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 text-white transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-6">
          <h1 className="text-2xl font-bold">PsicoApp</h1>
        </div>
        <nav className="mt-6">
          <a href="#" className="block py-3 px-6 hover:bg-slate-700">📅 Agenda</a>
          <a href="#" className="block py-3 px-6 hover:bg-slate-700">👥 Pacientes</a>
          <a href="#" className="block py-3 px-6 hover:bg-slate-700">⚙️ Configuración / Backup</a>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header móvil */}
        <header className="bg-white shadow-sm md:hidden flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">PsicoApp</h2>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-600 focus:outline-none"
          >
            {/* Icono de Menú Hamburguesa */}
            ☰
          </button>
        </header>

        {/* Área donde cargarán las vistas (Citas, Pacientes, etc.) */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}