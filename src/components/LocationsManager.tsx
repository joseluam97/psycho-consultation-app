import { useState, useEffect } from 'react';
import { locationService } from '../services/locationService';
import type { Location } from '../types.ts';
import { DetailsLocationForm } from './DetailsLocationForm.tsx';

export const LocationsManager = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedLocationDetails, setSelectedLocationDetails] = useState<Location | null>(null);

  // Estado del Modal y Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    zip_code: '',
    percentage_deducted: 0
  });

  // Cargar datos al montar
  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const data = await locationService.getAllActiveLocations();
      setLocations(data);
    } catch (error) {
      console.error("Error cargando ubicaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para NUEVO
  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ name: '', address: '', city: '', zip_code: '', percentage_deducted: 0 });
    setIsModalOpen(true);
  };

  // Abrir modal para EDITAR
  const handleOpenEdit = (loc: Location) => {
    setEditingId(loc.id!);
    setFormData({
      name: loc.name,
      address: loc.address || '',
      city: loc.city || '',
      zip_code: loc.zip_code || '',
      percentage_deducted: loc.percentage_deducted || 0
    });
    setIsModalOpen(true);
  };

  const handleDetailsDefaultAmount = (loc: Location) => {
    setSelectedLocationDetails(loc);
    setIsDetailsModalOpen(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("El nombre es obligatorio");

    try {
      if (editingId) {
        // Actualizar
        await locationService.updateLocation({
          id: editingId,
          name: formData.name,
          address: formData.address,
          city: formData.city,
          zip_code: formData.zip_code,
          percentage_deducted: formData.percentage_deducted,
          is_active: 1
        });
      } else {
        // Crear
        await locationService.createLocation(
          formData.name,
          formData.address,
          formData.city,
          formData.zip_code,
          formData.percentage_deducted
        );
      }
      setIsModalOpen(false);
      loadLocations(); // Recargar tabla
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Hubo un error al guardar la ubicación.");
    }
  };

  // Eliminar (Borrado Lógico)
  const handleDelete = async (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este centro? Las citas pasadas no se borrarán.")) {
      try {
        await locationService.deleteLocation(id);
        loadLocations();
      } catch (error) {
        console.error("Error eliminando:", error);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex justify-between items-center bg-tema-fondo p-6 rounded-xl border border-tema-borde shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-tema-titulos">Gestión de Centros</h2>
          <p className="text-tema-texto text-sm mt-1">Administra las ubicaciones donde pasas consulta.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-tema-acento text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          + Nuevo Centro
        </button>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-tema-fondo rounded-xl shadow-sm border border-tema-borde overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-tema-codigo text-tema-titulos text-sm uppercase tracking-wide border-b border-tema-borde">
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Dirección</th>
                <th className="p-4 font-semibold">Ciudad</th>
                <th className="p-4 font-semibold">Porcentaje</th>
                <th className="p-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tema-borde text-tema-texto">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center italic">Cargando...</td></tr>
              ) : locations.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center italic">No hay centros registrados.</td></tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-tema-codigo transition-colors">
                    <td className="p-4 font-medium text-tema-titulos">{loc.name}</td>
                    <td className="p-4 text-sm">{loc.address || '-'}</td>
                    <td className="p-4 text-sm">{loc.city ? `${loc.city} (${loc.zip_code || ''})` : '-'}</td>
                    <td className="p-4 text-sm">{loc.percentage_deducted + "%" || '0%'}</td>
                    <td className="p-4 flex justify-center gap-2">
                      <button
                        onClick={() => handleDetailsDefaultAmount(loc)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                        title="Precios por defecto"
                      >
                        💰
                      </button>
                      <button
                        onClick={() => handleOpenEdit(loc)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(loc.id!)}
                        className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Diálogo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-tema-fondo border border-tema-borde rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">

            <div className="p-5 border-b border-tema-borde flex justify-between items-center">
              <h3 className="text-lg font-bold text-tema-titulos">
                {editingId ? 'Editar Centro' : 'Nuevo Centro'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-tema-texto hover:text-red-500 font-bold text-xl leading-none">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-tema-titulos mb-1">Nombre del Centro *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-tema-codigo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                  placeholder="Ej. Clínica Centro"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-tema-titulos mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 bg-tema-codigo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                  placeholder="Calle, número, piso..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-tema-titulos mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2.5 bg-tema-codigo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                    placeholder="Ej. Madrid"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-tema-titulos mb-1">Código Postal</label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    className="w-full p-2.5 bg-tema-codigo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                    placeholder="Ej. 28001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-tema-titulos mb-1">Porcentaje a aportar a la responsable</label>
                <input
                  type="number"
                  value={formData.percentage_deducted}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setFormData({ ...formData, percentage_deducted: isNaN(value) ? 0 : value });
                  }}
                  className="w-full p-2.5 bg-tema-codigo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                  placeholder="50"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded font-medium text-tema-texto hover:bg-tema-codigo transition-colors border border-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded font-medium bg-tema-acento text-white hover:opacity-90 transition-opacity"
                >
                  {editingId ? 'Guardar Cambios' : 'Crear Centro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DetailsLocationForm
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        location={selectedLocationDetails}
      />
    </div>
  );
};