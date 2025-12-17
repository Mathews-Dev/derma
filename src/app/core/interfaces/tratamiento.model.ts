export type CategoriaTratamiento = 'facial' | 'corporal' | 'piel' | 'capilar' | 'bienestar' | 'quirurgico' | 'otro';

export interface Tratamiento {
    id: string;
    nombre: string;
    categoria: CategoriaTratamiento;
    etiquetas?: string[]; // Para filtrar: manchas, acné, arrugas, etc.
    descripcion: string;
    descripcionCorta: string;
    beneficios: string[];
    duracion: number; // minutos por sesión
    sesionesRecomendadas: number;
    precio: number;
    imagenes: string[];
    imagenPrincipal: string; // URL
    videoUrl?: string; // Link de YouTube
    contraindicaciones: string[];
    instruccionesPre: string[];
    instruccionesPost: string[];
    resultadosEsperados: string;
    tiempoRecuperacion: string;
    activo: boolean; // boolean
    destacado: boolean;
    orden: number;
    profesionalesSugeridos?: string[]; // Array de UIDs de doctores
}

export interface TratamientoPaciente {
    id: string;
    uidPaciente: string;        // Unified to uidPaciente (or pacienteId, picking one) - let's use pacienteId to match other models
    pacienteId: string;         // Keeping explicit naming
    tratamientoId: string;
    nombreTratamiento: string;
    profesionalId: string;
    profesionalNombre: string;
    fechaInicio: Date;
    fechaFinEstimada?: Date;
    estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'pausado';

    // Sesiones
    sesionesTotales: number;
    sesionesRealizadas: number; // Renamed from sesionesCompletadas for consistency
    progreso: number;           // Porcentaje 0-100
    proximaSesion?: Date;

    // Datos Clinicos
    notas?: string;
    resultados?: string;
    satisfaccion?: number;      // 1-5
}
