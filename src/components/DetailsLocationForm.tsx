import React, { useState, useEffect } from 'react';
import { defaultPriceLocationService } from '../services/defaultPriceLocationService';
import type { Location } from '../types.ts';

interface DetailsLocationFormProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
}

export const DetailsLocationForm: React.FC<DetailsLocationFormProps> = ({ isOpen, onClose, location }) => {
  const [loading, setLoading] = useState(false);
  
  // Estado para la configuración Individual (type_sesion = 0)
  const [individualConfig, setIndividualConfig] = useState<{ id?: number, amount: number, first: number }>({ amount: 0, first: 0 });
  
  // Estado para la configuración de Pareja (type_sesion = 1)
  const [coupleConfig, setCoupleConfig] = useState<{ id?: number, amount: number, first: number }>({ amount: 0, first: 0 });

  useEffect(() => {
    if (isOpen && location) {
      loadPrices();
    } else {
      // Limpiar al cerrar
      setIndividualConfig({ amount: 0, first: 0 });
      setCoupleConfig({ amount: 0, first: 0 });
    }
  }, [isOpen, location]);

  const loadPrices = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const data = await defaultPriceLocationService.getDefaultPriceByLocation(location.id!);
      
      // Separar los resultados
      const indv = data.find(p => p.type_sesion === 0);
      const cpl = data.find(p => p.type_sesion === 1);

      if (indv) setIndividualConfig({ id: indv.id, amount: indv.amount, first: indv.first_appointment_amount ? Number(indv.first_appointment_amount) : 0 });
      if (cpl) setCoupleConfig({ id: cpl.id, amount: cpl.amount, first: cpl.first_appointment_amount ? Number(cpl.first_appointment_amount) : 0 });

    } catch (error) {
      console.error("Error cargando configuración de precios:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (
    config: { id?: number, amount: number, first: number }, 
    type_sesion: number
  ) => {
    if (!location) return;

    try {
      if (config.id) {
        // Actualizar existente
        await defaultPriceLocationService.updateDefaultPrice(
          config.id,
          type_sesion,
          config.amount,
          config.first
        );
      } else {
        // Crear nuevo
        await defaultPriceLocationService.createDefaultPrice(
          location.id!,
          type_sesion,
          config.amount,
          config.first
        );
      }
      alert(`Precios de ${type_sesion === 0 ? 'Individual' : 'Pareja'} guardados correctamente.`);
      loadPrices(); // Recargar los IDs por si se acaba de crear uno nuevo
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar la configuración.");
    }
  };

  if (!isOpen || !location) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-tema-fondo border border-tema-borde rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Cabecera */}
        <div className="p-5 border-b border-tema-borde flex justify-between items-center bg-tema-codigo">
          <div>
            <h3 className="text-xl font-bold text-tema-titulos">
              Precios por Defecto
            </h3>
            <p className="text-sm text-tema-texto">{location.name}</p>
          </div>
          <button onClick={onClose} className="text-tema-texto hover:text-red-500 font-bold text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 overflow-y-auto max-h-[80vh]">
          {loading ? (
            <p className="text-center text-tema-texto py-4">Cargando datos...</p>
          ) : (
            <div className="space-y-6">
              
              {/* BLOQUE INDIVIDUAL */}
              <div className="bg-tema-codigo p-4 rounded-lg border border-tema-borde">
                <h4 className="font-bold text-tema-titulos mb-4 pb-2 border-b border-tema-borde">
                  Sesión Individual
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-tema-titulos mb-1">Precio Sesión (€)</label>
                    <input 
                      type="number" min="0"
                      value={individualConfig.amount === 0 ? '' : individualConfig.amount}
                      onChange={(e) => setIndividualConfig({...individualConfig, amount: parseInt(e.target.value) || 0})}
                      className="w-full p-2 bg-tema-fondo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-tema-titulos mb-1">Precio 1ª Cita (€)</label>
                    <input 
                      type="number" min="0"
                      value={individualConfig.first === 0 ? '' : individualConfig.first}
                      onChange={(e) => setIndividualConfig({...individualConfig, first: parseInt(e.target.value) || 0})}
                      className="w-full p-2 bg-tema-fondo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => handleSave(individualConfig, 0)}
                  className="w-full py-2 bg-tema-acento text-white rounded font-medium hover:opacity-90 transition-opacity text-sm"
                >
                  Guardar Precios Individuales
                </button>
              </div>

              {/* BLOQUE PAREJA */}
              <div className="bg-tema-codigo p-4 rounded-lg border border-tema-borde">
                <h4 className="font-bold text-tema-titulos mb-4 pb-2 border-b border-tema-borde">
                  Sesión Pareja
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-tema-titulos mb-1">Precio Sesión (€)</label>
                    <input 
                      type="number" min="0"
                      value={coupleConfig.amount === 0 ? '' : coupleConfig.amount}
                      onChange={(e) => setCoupleConfig({...coupleConfig, amount: parseInt(e.target.value) || 0})}
                      className="w-full p-2 bg-tema-fondo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-tema-titulos mb-1">Precio 1ª Cita (€)</label>
                    <input 
                      type="number" min="0"
                      value={coupleConfig.first === 0 ? '' : coupleConfig.first}
                      onChange={(e) => setCoupleConfig({...coupleConfig, first: parseInt(e.target.value) || 0})}
                      className="w-full p-2 bg-tema-fondo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => handleSave(coupleConfig, 1)}
                  className="w-full py-2 bg-tema-acento text-white rounded font-medium hover:opacity-90 transition-opacity text-sm"
                >
                  Guardar Precios Pareja
                </button>
              </div>

            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-tema-borde bg-tema-fondo flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};