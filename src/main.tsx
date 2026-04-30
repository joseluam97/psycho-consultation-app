import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader'
import { BrowserRouter } from 'react-router-dom' // <-- Importante
import './index.css'
import App from './App.tsx'

const mountReact = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* Envolvemos la app en el Router */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

if (Capacitor.getPlatform() === 'web') {
  jeepSqlite(window);
  
  window.addEventListener('DOMContentLoaded', async () => {
    const jeepEl = document.createElement("jeep-sqlite");
    document.body.appendChild(jeepEl);
    await customElements.whenDefined('jeep-sqlite');
    mountReact();
  });
} else {
  mountReact();
}