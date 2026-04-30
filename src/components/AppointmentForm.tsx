import { useState, useEffect } from 'react';
import { patientService } from '../services/patientService';
import { appointmentService } from '../services/appointmentService';
import type { Patient, Location, DefaultPriceByLocation } from '../types.ts';
import { locationService } from '../services/locationService.ts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { defaultPriceLocationService } from '../services/defaultPriceLocationService.ts';

interface AppointmentFormProps {
    fixedLocationId?: number; // Si viene, el centro está bloqueado
    patientsList?: Patient[];  // Lista pre-filtrada opcional
    onSuccess: () => void;
    onCancel: () => void;
}

export const AppointmentForm = ({ fixedLocationId, patientsList, onSuccess, onCancel }: AppointmentFormProps) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);

    // Configuramos los límites de tiempo (08:00 a 22:00)
    const minTime = new Date();
    minTime.setHours(8, 0, 0, 0);

    const maxTime = new Date();
    maxTime.setHours(22, 0, 0, 0);

    const [formData, setFormData] = useState({
        location_id: '',
        patient_id: '',
        appointment_datetime: new Date().toISOString().slice(0, 16), // Formato para datetime-local
        amount: '',
        payment_method_id: '',
        is_first_appointment: 0
    });

    useEffect(() => {
        const loadData = async () => {
            if (!patientsList) {
                const all = await patientService.getAllActivePatients();
                setPatients(all);
            } else {
                setPatients(patientsList);
            }

            if (!fixedLocationId) {
                const locs = await locationService.getAllActiveLocations();
                setLocations(locs);
            }
        };
        loadData();
    }, [patientsList, fixedLocationId]);

    useEffect(() => {
        const changeLocationInForm = async () => {
            if (formData.location_id) {
                let id_location = Number(formData.location_id);
                const clients_byLocation = await patientService.getPatientsByLocation(id_location);
                setPatients(clients_byLocation);
            }
            else {
                const all = await patientService.getAllActivePatients();
                setPatients(all);
            }
        };
        changeLocationInForm();
    }, [formData.location_id]);

    useEffect(() => {
        const loadData = async () => {
            // Si no nos pasan una lista pre-filtrada, cargamos todos
            if (!patientsList) {
                const all = await patientService.getAllActivePatients();
                setPatients(all);
            } else {
                setPatients(patientsList);
            }
        };
        loadData();
    }, [patientsList]);

    useEffect(() => {
        const loadDefaultPrice = async () => {
            if (formData.location_id && formData.patient_id) {
                setDefaultPriceByLocation(Number(formData.location_id), Number(formData.patient_id));
            }
            else {
                let final_price = 0;
                setFormData(prev => ({
                    ...prev,
                    amount: final_price.toString()
                }));
            }

        };
        loadDefaultPrice();
    }, [formData.location_id, formData.patient_id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.patient_id) return alert("Selecciona un paciente");

        await appointmentService.createAppointment({
            patient_id: Number(formData.patient_id),
            location_id: fixedLocationId || Number(formData.location_id),
            appointment_datetime: formData.appointment_datetime,
            amount: Number(formData.amount) * 100, // Euros a céntimos
            payment_method_id: formData.payment_method_id ? Number(formData.payment_method_id) : null,
            is_first_appointment: formData.is_first_appointment
        });

        onSuccess();
    };

    const setDefaultPriceByLocation = async (location_id: number, patient_id: number) => {
        let patient = patients.find(p => p.id === patient_id);
        let is_first_appointment: boolean = await appointmentService.checkIfPatientIsFirstAppointment(patient_id);
        const defaultPrices: DefaultPriceByLocation[] = await defaultPriceLocationService.getDefaultPriceByLocationAndType(location_id);
        let type_sesion = 0; // Por defecto individual
        if (patient?.is_couple) {
            type_sesion = 1; // Si el paciente es de pareja, buscamos la configuración de pareja
        }
        const individualPrice: DefaultPriceByLocation | undefined = defaultPrices.find(p => p.type_sesion === type_sesion);
        if (individualPrice) {
            if (is_first_appointment) {
                setFormData(prev => ({
                    ...prev,
                    amount: individualPrice.first_appointment_amount.toString()
                }));
            }
            else {
                setFormData(prev => ({
                    ...prev,
                    amount: individualPrice.amount.toString()
                }));
            }
        }
    };

    const getRoundedNow = () => {
        const now = new Date();
        const minutes = now.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 5) * 5; // Redondea hacia arriba al múltiplo de 5

        const roundedDate = new Date(now);
        roundedDate.setMinutes(roundedMinutes);
        roundedDate.setSeconds(0);
        roundedDate.setMilliseconds(0);
        return roundedDate;
    };

    // Función para convertir un objeto Date a tu formato de string local "YYYY-MM-DDTHH:mm"
    const formatDateToLocalString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // --- EFECTO INICIAL ---
    // Si al cargar no hay fecha, ponemos la actual redondeada
    useEffect(() => {
        setFormData({
            ...formData,
            appointment_datetime: formatDateToLocalString(getRoundedNow())
        });
    }, []);

    // --- CONVERSIÓN PARA EL SELECTOR ---
    // Convertimos el string del estado a objeto Date respetando la hora local
    const getCurrentDateTimeObject = () => {
        if (!formData.appointment_datetime) return getRoundedNow();

        // Separamos manualmente para evitar desfases de zona horaria del constructor Date
        const [datePart, timePart] = formData.appointment_datetime.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);

        return new Date(year, month - 1, day, hours, minutes);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-1">
            {!fixedLocationId && (
                <div>
                    <label className="block text-sm font-semibold text-tema-titulos mb-1">Centro Médico *</label>
                    <select
                        required
                        value={(formData as any).location_id || ''}
                        onChange={(e) => setFormData({ ...formData, location_id: e.target.value } as any)}
                        className="w-full p-2 bg-tema-codigo border border-tema-borde rounded text-tema-texto"
                    >
                        <option value="">-- Seleccionar Centro --</option>
                        {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                    </select>
                </div>
            )}
            <div>
                <label className="block text-sm font-semibold text-tema-titulos mb-1">Paciente</label>
                <select
                    required
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    className="w-full p-2 bg-tema-codigo border border-tema-borde rounded text-tema-texto"
                >
                    <option value="">-- Seleccionar Paciente --</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-tema-titulos mb-1">Fecha</label>
                    <input
                        type="date"
                        value={formData.appointment_datetime?.split('T')[0] || ''}
                        onChange={(e) => {
                            const newDate = e.target.value;
                            const currentTime = formData.appointment_datetime?.split('T')[1] || '08:00';
                            setFormData({ ...formData, appointment_datetime: `${newDate}T${currentTime}` });
                        }}
                        className="w-full p-2 bg-tema-codigo border border-tema-borde rounded text-tema-texto"
                    />
                </div>

                {/* Campo de Hora */}
                <div>
                    <label className="block text-sm font-semibold text-tema-titulos mb-1">Hora</label>
                    <DatePicker
                        selected={getCurrentDateTimeObject()}
                        onChange={(date: any) => {
                            if (date) {
                                setFormData({
                                    ...formData,
                                    appointment_datetime: formatDateToLocalString(date)
                                });
                            }
                        }}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={30}
                        timeCaption="Hora"
                        dateFormat="HH:mm"
                        timeFormat="HH:mm"
                        minTime={minTime}
                        maxTime={maxTime}
                        className="w-full p-2 bg-tema-codigo border border-tema-borde rounded text-tema-texto"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-tema-titulos mb-1">Importe (€)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full p-2 bg-tema-codigo border border-tema-borde rounded text-tema-texto"
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-tema-texto hover:bg-tema-codigo rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-tema-acento text-white rounded font-bold">Guardar Cita</button>
            </div>
        </form>
    );
};