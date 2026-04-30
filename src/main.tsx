import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader'
import './index.css'
import App from './App.tsx'

// Función para montar React
const mountReact = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Lógica de arranque según la plataforma
if (Capacitor.getPlatform() === 'web') {
  // 1. Definir el Web Component
  jeepSqlite(window);
  
  window.addEventListener('DOMContentLoaded', async () => {
    // 2. Crear e inyectar la etiqueta <jeep-sqlite> en el HTML
    const jeepEl = document.createElement("jeep-sqlite");
    document.body.appendChild(jeepEl);
    
    // 3. Esperar a que el navegador registre el componente
    await customElements.whenDefined('jeep-sqlite');
    
    // 4. Montar la app de React
    mountReact();
  });
} else {
  // En Android/iOS, el motor nativo ya está listo, montamos directo
  mountReact();
}