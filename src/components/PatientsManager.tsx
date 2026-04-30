import { useState, useEffect } from 'react';
import { patientService } from '../services/patientService';
import { locationService } from '../services/locationService';
import type { Patient, Location } from '../types.ts';
import { useNavigate } from 'react-router-dom';

export const PatientsManager = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado del Modal y Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date_of_birth: '',
    default_location_id: '',
    bail_amount: '',
    is_couple: false
  });

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargamos pacientes y ubicaciones en paralelo para mayor rendimiento
      const [patientsData, locationsData] = await Promise.all([
        patientService.getAllActivePatients(),
        locationService.getAllActiveLocations()
      ]);
      setPatients(patientsData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper para mostrar el nombre del centro en la tabla
  const getLocationName = (id?: number) => {
    if (!id) return '-';
    const loc = locations.find(l => l.id === id);
    return loc ? loc.name : '-';
  };

  // Abrir modal para NUEVO
  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', date_of_birth: '', default_location_id: '', bail_amount: '', is_couple: false });
    setIsModalOpen(true);
  };

  // Abrir modal para EDITAR
  const handleOpenEdit = (patient: Patient) => {
    setEditingId(patient.id!);
    setFormData({
      name: patient.name,
      phone: patient.phone || '',
      date_of_birth: patient.date_of_birth ? patient.date_of_birth.split('T')[0] : '', // Formato YYYY-MM-DD para el input type="date"
      default_location_id: patient.default_location_id ? patient.default_location_id.toString() : '',
      bail_amount: patient.bail_amount ? (patient.bail_amount / 100).toFixed(2) : '',
      is_couple: patient.is_couple
    });
    setIsModalOpen(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("El nombre es obligatorio");

    const locId = formData.default_location_id ? Number(formData.default_location_id) : undefined;

    try {
      if (editingId) {
        // Actualizar datos básicos
        await patientService.updatePatient({
          id: editingId,
          name: formData.name,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth,
          is_active: 1,
          is_couple: formData.is_couple,
          bail_amount: formData.bail_amount ? Math.round(parseFloat(formData.bail_amount) * 100) : 0
        });
        // Actualizar ubicación por defecto (lo teníamos como un método separado en el servicio)
        await patientService.updateDefaultLocation(editingId, locId || null);
      } else {
        // Crear
        await patientService.createPatient(
          formData.name,
          formData.date_of_birth,
          formData.phone,
          locId,
          formData.is_couple == true ? 1 : 0,
          formData.bail_amount ? Math.round(parseFloat(formData.bail_amount) * 100) : 0
        );
      }
      setIsModalOpen(false);
      loadData(); // Recargar tabla
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Hubo un error al guardar el paciente.");
    }
  };

  // Eliminar (Borrado Lógico)
  const handleDelete = async (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este paciente? Su historial clínico y notas se mantendrán, pero no aparecerá en búsquedas nuevas.")) {
      try {
        await patientService.deletePatient(id);
        loadData();
      } catch (error) {
        console.error("Error eliminando:", error);
      }
    }
  };

  const openDetailsPacient = (patientId: number) => {
    navigate(`/patient/${patientId}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex justify-between items-center bg-tema-fondo p-6 rounded-xl border border-tema-borde shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-tema-titulos">Gestión de Pacientes</h2>
          <p className="text-tema-texto text-sm mt-1">Administra la información de contacto de tus pacientes.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-tema-acento text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          + Nuevo Paciente
        </button>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-tema-fondo rounded-xl shadow-sm border border-tema-borde overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-tema-codigo text-tema-titulos text-sm uppercase tracking-wide border-b border-tema-borde">
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Teléfono</th>
                <th className="p-4 font-semibold">F. Nacimiento</th>
                <th className="p-4 font-semibold">Centro Habitual</th>
                <th className="p-4 font-semibold">Fianza</th>
                <th className="p-4 font-semibold">Es pareja</th>
                <th className="p-4 font-semibold text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tema-borde text-tema-texto">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center italic">Cargando pacientes...</td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center italic">No hay pacientes registrados.</td></tr>
              ) : (
                patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-tema-codigo transition-colors"
                  >
                    <td className="p-4 font-medium text-tema-titulos">{patient.name}</td>
                    <td className="p-4 text-sm">{patient.phone || '-'}</td>
                    <td className="p-4 text-sm">{patient.date_of_birth || '-'}</td>
                    <td className="p-4 text-sm">
                      <span className="bg-tema-codigo px-2 py-1 rounded border border-tema-borde text-xs font-medium">
                        {getLocationName(patient.default_location_id)}
                      </span>
                    </td>
                    <td className="p-4 text-sm">{(patient.bail_amount / 100).toFixed(2)}</td>
                    <td className="p-4 text-sm">{patient.is_couple == true ? "SI" : "NO"}</td>
                    <td className="p-4 flex justify-center gap-2">
                      <button
                        onClick={() => openDetailsPacient(patient.id!)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                        title="Detalles"
                      >
                        👥
                      </button>
                      <button
                        onClick={() => handleOpenEdit(patient)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(patient.id!)}
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
                {editingId ? 'Editar Paciente' : 'Nuevo Paciente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-tema-texto hover:text-red-500 font-bold text-xl leading-none">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-tema-titulos mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-tema-codigo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-tema-titulos mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 bg-tema-codigo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                    placeholder="Ej. 600 123 456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-tema-titulos mb-1">F. Nacimiento</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full p-2.5 bg-tema-codigo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-tema-titulos mb-1">Centro Habitual (Opcional)</label>
                <select
                  value={formData.default_location_id}
                  onChange={(e) => setFormData({ ...formData, default_location_id: e.target.value })}
                  className="w-full p-2.5 bg-tema-codigo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                >
                  <option value="">-- Sin asignar --</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-tema-titulos mb-1">Fianza (Opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bail_amount}
                  onChange={(e) => setFormData({ ...formData, bail_amount: e.target.value })}
                  className="w-full p-2 bg-tema-codigo border border-tema-borde rounded text-tema-texto"
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_couple"
                  checked={formData.is_couple || false}
                  onChange={(e) => setFormData({ ...formData, is_couple: e.target.checked })}
                  className="w-4 h-4 text-tema-acento bg-tema-codigo border-tema-borde rounded focus:ring-2 focus:ring-tema-acento cursor-pointer"
                />
                <label htmlFor="is_couple" className="text-sm font-semibold text-tema-titulos cursor-pointer select-none">
                  Este paciente engloba una pareja
                </label>
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
                  {editingId ? 'Guardar Cambios' : 'Crear Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};