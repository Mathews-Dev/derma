export interface Cita {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    profesionalId: string;
    profesionalNombre: string;
    tratamientoId: string;
    tratamientoNombre: string;
    fecha: Date;
    hora: string;
    duracion: number; // minutos
    estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'reprogramada';
    notas?: string;
    instruccionesPre?: string[];
    instruccionesPost?: string[];
    recordatorioEnviado: boolean;
    motivoCancelacion?: string;
    fechaCreacion: Date;
    fechaActualizacion?: Date;
}
