import { useState, useEffect } from 'react';
import { paymentMethodService } from '../services/paymentMethodService';
import type { PaymentMethod } from '../types.ts';

export const PaymentMethodsManager = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado del Modal y Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: ''
  });

  // Cargar datos al montar
  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const data = await paymentMethodService.getAllActivePaymentMethods();
      setMethods(data);
    } catch (error) {
      console.error("Error cargando métodos de pago:", error);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para NUEVO
  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ name: '' });
    setIsModalOpen(true);
  };

  // Abrir modal para EDITAR
  const handleOpenEdit = (method: PaymentMethod) => {
    setEditingId(method.id!);
    setFormData({
      name: method.name
    });
    setIsModalOpen(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("El nombre es obligatorio");

    try {
      if (editingId) {
        // Actualizar
        await paymentMethodService.updatePaymentMethod({
          id: editingId,
          name: formData.name,
          is_active: 1
        });
      } else {
        // Crear
        await paymentMethodService.createPaymentMethod(formData.name);
      }
      setIsModalOpen(false);
      loadMethods(); // Recargar tabla
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Hubo un error al guardar el método de pago.");
    }
  };

  // Eliminar (Borrado Lógico)
  const handleDelete = async (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este método de pago? Los registros de facturación anteriores no se verán afectados.")) {
      try {
        await paymentMethodService.deletePaymentMethod(id);
        loadMethods();
      } catch (error) {
        console.error("Error eliminando:", error);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex justify-between items-center bg-tema-fondo p-6 rounded-xl border border-tema-borde shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-tema-titulos">Métodos de Pago</h2>
          <p className="text-tema-texto text-sm mt-1">Gestiona las formas de cobro aceptadas en la clínica.</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="bg-tema-acento text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          + Nuevo Método
        </button>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-tema-fondo rounded-xl shadow-sm border border-tema-borde overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-tema-codigo text-tema-titulos text-sm uppercase tracking-wide border-b border-tema-borde">
                <th className="p-4 font-semibold">Nombre del Método</th>
                <th className="p-4 font-semibold text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tema-borde text-tema-texto">
              {loading ? (
                <tr><td colSpan={2} className="p-8 text-center italic">Cargando...</td></tr>
              ) : methods.length === 0 ? (
                <tr><td colSpan={2} className="p-8 text-center italic">No hay métodos de pago registrados.</td></tr>
              ) : (
                methods.map((method) => (
                  <tr key={method.id} className="hover:bg-tema-codigo transition-colors">
                    <td className="p-4 font-medium text-tema-titulos">{method.name}</td>
                    <td className="p-4 flex justify-center gap-2">
                      <button 
                        onClick={() => handleOpenEdit(method)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(method.id!)}
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
                {editingId ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-tema-texto hover:text-red-500 font-bold text-xl leading-none">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-tema-titulos mb-1">Nombre *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2.5 bg-tema-codigo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                  placeholder="Ej. Bizum, Efectivo, Tarjeta..."
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
                  {editingId ? 'Guardar Cambios' : 'Crear Método'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};