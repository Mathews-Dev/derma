export type CategoriaTratamiento = 'facial' | 'corporal' | 'piel' | 'capilar' | 'bienestar' | 'otro';

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
    uidPaciente: string;
    idTratamiento: string;
    nombreTratamiento: string;
    fechaInicio: Date;
    estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado';
    sesionesTotales: number;
    sesionesRealizadas: number;
    progreso: number; // Porcentaje 0-100
    proximaSesion?: Date;
    notas?: string;
}

export interface TratamientoPaciente {
    id: string;
    pacienteId: string;
    tratamientoId: string;
    tratamientoNombre: string;
    profesionalId: string;
    profesionalNombre: string;
    sesionesTotales: number;
    sesionesCompletadas: number;
    fechaInicio: Date;
    fechaFinEstimada?: Date;
    // estado: 'activo' | 'completado' | 'pausado' | 'cancelado';
    proximaSesion?: Date;
    notas?: string;
    resultados?: string;
    satisfaccion?: number; // 1-5
}
