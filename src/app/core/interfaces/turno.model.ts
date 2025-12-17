export enum EstadoTurno {
    PENDIENTE = 'pendiente',       // Creado por paciente
    CONFIRMADO = 'confirmado',     // Aprobado por recepcionista
    REPROGRAMADO = 'reprogramado', // Turno fue movido a nueva fecha/hora
    CANCELADO = 'cancelado',       // Cancelado por paciente/admin
    COMPLETADO = 'completado',     // Consulta finalizada
    NO_ASISTIO = 'no_asistio'      // Paciente faltó
}

export interface Turno {
    id: string;
    pacienteId: string; // Usuario que solicita
    profesionalId: string; // Dermatólogo asignado
    tipo?: 'consulta' | 'tratamiento'; // Diferencia visual en agenda
    tratamientoId?: string | null; // Opcional: Si es para un tratamiento específico
    fecha: Date | any; // Día del turno (Firestore Timestamp)
    horaInicio: string; // "09:00"
    horaFin: string; // "09:45" (calculado según duracionConsulta)
    estado: EstadoTurno;
    motivo?: string | null; // Razón de la consulta
    notasPaciente?: string | null;
    notasProfesional?: string | null;
    fechaCreacion: Date | any; // Firestore Timestamp
    fechaModificacion?: Date | any | null; // Firestore Timestamp

    // WhatsApp Notifications
    notificacionesWhatsApp: boolean; // Si el paciente quiere recibir notificaciones
    telefonoNotificaciones?: string | null; // Número para WhatsApp (puede diferir del telefono principal)

    // Historial de Reprogramación
    turnoOriginalId?: string | null; // Si fue reprogramado, referencia al turno anterior
    motivoReprogramacion?: string | null;

    // Pago
    estadoPago: 'PENDIENTE' | 'PAGADO';
    monto: number;
    metodoPago?: 'TARJETA' | 'EFECTIVO';
}

export interface SlotHorario {
    hora: string; // "09:00"
    disponible: boolean;
    turnoId?: string; // Si está ocupado, referencia al turno
}
