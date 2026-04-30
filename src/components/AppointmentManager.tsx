import { useState, useEffect } from 'react';
import { appointmentService } from '../services/appointmentService';
import { noteService } from '../services/noteService';
import { paymentMethodService } from '../services/paymentMethodService';
import type { Appointment, Note, PaymentMethod } from '../types';

interface AppointmentManagerProps {
    appointmentId: number;
    onActionComplete: () => void;
    onClose: () => void;
}

export const AppointmentManager = ({ appointmentId, onActionComplete, onClose }: AppointmentManagerProps) => {
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [originalNotes, setOriginalNotes] = useState<Note[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Nuevo estado para el monto de devolución (se maneja como string para el input, se convierte a number al guardar)
    const [returnAmount, setReturnAmount] = useState<string>('0'); 

    // ESTADOS BORRADOR
    const [draftStatus, setDraftStatus] = useState<'pending' | 'finished' | 'cancelled'>('pending');
    const [draftPaymentId, setDraftPaymentId] = useState<string>('');
    const [draftDatetime, setDraftDatetime] = useState<string>(''); // Para editar la fecha

    // Notas
    const [currentNoteText, setCurrentNoteText] = useState('');
    const [draftNotes, setDraftNotes] = useState<string[]>([]);

    useEffect(() => {
        loadAppointmentDetails();
    }, [appointmentId]);

    const loadAppointmentDetails = async () => {
        setLoading(true);
        try {
            const [apt, aptNotes, methods] = await Promise.all([
                appointmentService.getAppointmentById(appointmentId),
                noteService.getActiveNotesByAppointment(appointmentId),
                paymentMethodService.getAllActivePaymentMethods()
            ]);

            setAppointment(apt);
            setOriginalNotes(aptNotes);
            setPaymentMethods(methods);

            // Inicializar borradores
            setDraftStatus(apt?.is_finished ? 'finished' : apt?.is_cancelled ? 'cancelled' : 'pending');
            setDraftPaymentId(apt?.payment_method_id ? apt?.payment_method_id.toString() : '');

            // Convertimos los céntimos de la DB a euros para mostrarlos en el input
            if (apt && apt.return_amount) {
                setReturnAmount((apt.return_amount / 100).toString());
            } else {
                setReturnAmount('0');
            }

            // Convertir fecha de SQLite a formato para el input datetime-local (YYYY-MM-DDThh:mm)
            const dateForInput = new Date(apt?.appointment_datetime || "").toISOString().slice(0, 16);
            setDraftDatetime(dateForInput);

            setDraftNotes([]);
        } catch (error) {
            console.error("Error al cargar detalles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleQueueNote = () => {
        if (!currentNoteText.trim()) return;
        setDraftNotes([...draftNotes, currentNoteText]);
        setCurrentNoteText('');
    };

    const handleSaveChanges = async () => {
        if (!appointment) return;
        setIsSaving(true);

        try {
            // 1. Guardar Estado de la cita
            if (draftStatus === 'finished') {
                await appointmentService.markAsCancelled(appointmentId, false);
                await appointmentService.markAsFinished(appointmentId, true);
            } else if (draftStatus === 'cancelled') {
                await appointmentService.markAsCancelled(appointmentId, true);
                await appointmentService.markAsFinished(appointmentId, false);
            }
            else if (draftStatus === 'pending') {
                await appointmentService.markAsCancelled(appointmentId, false);
                await appointmentService.markAsFinished(appointmentId, false);
            }


            if (draftStatus === 'finished' && !draftPaymentId) {
                setIsSaving(false);
                return alert("Para marcar la cita como finalizada, debes asignar un método de pago.");
            }

            // 2. Si está pendiente, guardar la nueva fecha/hora si ha cambiado
            if (draftStatus === 'pending' && draftDatetime !== new Date(appointment.appointment_datetime).toISOString().slice(0, 16)) {
                await appointmentService.updateDateTime(appointmentId, draftDatetime);
            }

            // 3. Si está finalizada, guardar Método de Pago Y Monto de Devolución
            if (draftStatus === 'finished') {
                const pId = draftPaymentId ? Number(draftPaymentId) : null;
                const parsedReturnAmount = Math.round(parseFloat(returnAmount || '0') * 100); // Pasamos de Euros a céntimos
                
                // Actualizamos ambos campos a la vez con el nuevo método
                await appointmentService.updatePaymentDetails(appointmentId, pId, parsedReturnAmount);
            }

            // 4. Guardar Notas
            for (const noteText of draftNotes) {
                await noteService.createNote(appointment.patient_id, noteText, appointmentId);
            }

            onActionComplete();
            onClose();
        } catch (error) {
            console.error("Error guardando los cambios:", error);
            alert("Hubo un error al guardar los cambios.");
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("¿Borrar definitivamente esta cita?")) {
            await appointmentService.deleteAppointment(appointmentId);
            onActionComplete();
            onClose();
        }
    };

    // Lógica para habilitar el botón de guardar
    // Comprobamos si el returnAmount ha cambiado respecto al original
    const initialReturnAmount = appointment?.return_amount ? (appointment.return_amount / 100).toString() : '0';
    
    const hasChanges =
        draftStatus !== (appointment?.is_finished ? 'finished' : appointment?.is_cancelled ? 'cancelled' : 'pending') ||
        (draftStatus === 'finished' && draftPaymentId !== (appointment?.payment_method_id ? appointment.payment_method_id.toString() : '')) ||
        (draftStatus === 'finished' && returnAmount !== initialReturnAmount) || // <-- Añadido al detector de cambios
        (draftStatus === 'pending' && draftDatetime !== (appointment ? new Date(appointment.appointment_datetime).toISOString().slice(0, 16) : '')) ||
        draftNotes.length > 0;

    if (loading || !appointment) return <div className="p-10 text-center">Cargando gestión de cita...</div>;

    return (
        <div className="flex flex-col h-full bg-tema-fondo text-tema-texto">

            {/* Cabecera Estática */}
            <div className="p-6 border-b border-tema-borde flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-tema-titulos">{appointment.patient_name}</h3>
                    <p className="text-sm opacity-70">
                        {new Date(appointment.appointment_datetime).toLocaleString('es-ES', {
                            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                        })}
                    </p>
                </div>
                <button onClick={onClose} className="p-2 text-tema-texto hover:text-red-500 font-bold text-xl leading-none">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* SELECTOR DE ESTADO MAESTRO */}
                <section>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-tema-acento mb-4">Estado de la Sesión</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <button onClick={() => setDraftStatus('pending')} className={`p-3 rounded-xl border-2 flex flex-col items-center transition-all ${draftStatus === 'pending' ? 'bg-blue-500/10 border-blue-500 text-blue-600' : 'border-tema-borde hover:border-blue-300'}`}>
                            <span className="text-xl">⏳</span><span className="font-bold mt-1 text-sm">Pendiente</span>
                        </button>
                        <button onClick={() => setDraftStatus('finished')} className={`p-3 rounded-xl border-2 flex flex-col items-center transition-all ${draftStatus === 'finished' ? 'bg-green-500/10 border-green-500 text-green-600' : 'border-tema-borde hover:border-green-300'}`}>
                            <span className="text-xl">✅</span><span className="font-bold mt-1 text-sm">Finalizar</span>
                        </button>
                        <button onClick={() => setDraftStatus('cancelled')} className={`p-3 rounded-xl border-2 flex flex-col items-center transition-all ${draftStatus === 'cancelled' ? 'bg-red-500/10 border-red-500 text-red-600' : 'border-tema-borde hover:border-red-300'}`}>
                            <span className="text-xl">🚫</span><span className="font-bold mt-1 text-sm">Cancelar</span>
                        </button>
                    </div>
                </section>

                {/* --- PANELES CONDICIONALES SEGÚN EL ESTADO --- */}

                {/* PANEL: SOLO EN ESTADO PENDIENTE */}
                {draftStatus === 'pending' && (
                    <section className="bg-tema-codigo p-4 rounded-xl border border-tema-borde animate-fade-in">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-tema-titulos opacity-60 mb-3">Modificar Fecha y Hora</h4>
                        <input
                            type="datetime-local"
                            value={draftDatetime}
                            onChange={(e) => setDraftDatetime(e.target.value)}
                            className="w-full p-3 bg-tema-fondo border border-tema-borde rounded text-tema-texto focus:ring-2 focus:ring-tema-acento outline-none transition-all"
                        />
                    </section>
                )}

                {/* PANEL: SOLO EN ESTADO FINALIZAR */}
                {draftStatus === 'finished' && (
                    <section className="bg-tema-codigo p-4 rounded-xl border border-tema-borde animate-fade-in space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-tema-titulos opacity-60 mb-3">Datos de Cobro</h4>
                        
                        <div className="flex flex-col gap-4">
                            {/* Fila 1: Total y Método de Pago */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex flex-col">
                                    <span className="text-xs text-tema-texto opacity-70">Total a cobrar</span>
                                    <span className="text-2xl font-bold text-tema-titulos">
                                        {(appointment.amount / 100).toFixed(2)} €
                                    </span>
                                </div>
                                <select
                                    value={draftPaymentId}
                                    onChange={(e) => setDraftPaymentId(e.target.value)}
                                    className="bg-tema-fondo border border-tema-borde p-3 rounded text-sm min-w-[200px] outline-none focus:border-tema-acento"
                                >
                                    <option value="">Seleccionar método...</option>
                                    {paymentMethods.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Fila 2: Cambio devuelto (Sólo tiene sentido si no es transferencia/tarjeta, pero lo dejamos abierto por si acaso) */}
                            <div className="flex flex-col bg-tema-fondo p-3 rounded border border-tema-borde/50">
                                <label className="text-xs font-bold text-tema-texto mb-1">Cambio a devolver (€)</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 font-bold">€</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={returnAmount}
                                        onChange={(e) => setReturnAmount(e.target.value)}
                                        className="w-full bg-transparent border-none outline-none text-tema-texto font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* PANEL: NOTAS (VISIBLE EN TODOS LOS ESTADOS) */}
                <section className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-tema-acento">Notas de Evolución</h4>
                    <div className="space-y-3">
                        {originalNotes.map(note => (
                            <div key={note.id} className="p-3 bg-tema-fondo border border-tema-borde rounded-lg text-sm shadow-sm opacity-80">
                                {note.content}
                            </div>
                        ))}

                        {draftNotes.map((note, index) => (
                            <div key={index} className="p-3 bg-tema-codigo border-l-4 border-l-tema-acento border border-tema-borde rounded-lg text-sm shadow-sm">
                                <span className="text-xs font-bold text-tema-acento block mb-1">NUEVA (Sin guardar)</span>
                                {note}
                            </div>
                        ))}

                        <div className="flex gap-2">
                            <textarea
                                value={currentNoteText}
                                onChange={(e) => setCurrentNoteText(e.target.value)}
                                placeholder="Escribe una observación clínica..."
                                className="flex-1 p-3 bg-tema-fondo border border-tema-borde rounded-lg text-sm outline-none focus:ring-2 focus:ring-tema-acento resize-none"
                                rows={2}
                            />
                            <button
                                onClick={handleQueueNote}
                                disabled={!currentNoteText.trim()}
                                className="bg-tema-codigo border border-tema-borde text-tema-titulos px-4 rounded-lg font-bold hover:bg-tema-fondo disabled:opacity-50 transition-colors"
                            >
                                Añadir
                            </button>
                        </div>
                    </div>
                </section>

            </div>

            {/* FOOTER: Barra de Guardar */}
            <div className="p-4 border-t border-tema-borde bg-tema-fondo flex justify-between items-center mt-auto">
                <button onClick={handleDelete} className="text-red-500 text-sm font-bold hover:underline">
                    🗑️ Eliminar Cita
                </button>
                <div className="flex gap-3">
                    <button onClick={onClose} className="px-5 py-2 rounded-lg font-bold text-tema-texto hover:bg-tema-codigo transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveChanges}
                        disabled={!hasChanges || isSaving}
                        className={`px-6 py-2 rounded-lg font-bold text-white transition-all shadow-sm ${hasChanges ? 'bg-tema-acento hover:opacity-90' : 'bg-gray-400 cursor-not-allowed opacity-50'}`}
                    >
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};