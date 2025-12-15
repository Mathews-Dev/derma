export interface HistorialMedico {
    pacienteId: string;
    alergias: Alergia[];
    condicionesMedicas: CondicionMedica[];
    medicamentosActuales: Medicamento[];
    cirugiasPrevia: CirugiaPrevias[];
    consentimientos: Consentimiento[];
    notas?: string;
    ultimaActualizacion: Date;
}

export interface Alergia {
    tipo: string;
    descripcion: string;
    severidad: 'leve' | 'moderada' | 'severa';
    fechaDeteccion?: Date;
}

export interface CondicionMedica {
    nombre: string;
    descripcion?: string;
    fechaDiagnostico?: Date;
    activa: boolean;
}

export interface Medicamento {
    nombre: string;
    dosis: string;
    frecuencia: string;
    fechaInicio: Date;
    fechaFin?: Date;
}

export interface CirugiaPrevias {
    tipo: string;
    descripcion?: string;
    fecha: Date;
    complicaciones?: string;
}

export interface Consentimiento {
    tratamientoId: string;
    tratamientoNombre: string;
    fecha: Date;
    firmado: boolean;
    documentoUrl?: string;
}

export interface FotoProgreso {
    id: string;
    pacienteId: string;
    tratamientoId: string;
    tratamientoNombre: string;
    fecha: Date;
    tipo: 'antes' | 'durante' | 'despues';
    sesionNumero?: number;
    imagenUrl: string;
    miniaturalUrl?: string;
    notas?: string;
    visiblePaciente: boolean;
}

export interface ResultadoTratamiento {
    id: string;
    pacienteId: string;
    tratamientoId: string;
    tratamientoNombre: string;
    profesionalId: string;
    fecha: Date;
    satisfaccionPaciente: number; // 1-5
    comentarioPaciente?: string;
    notasProfesional?: string;
    recomendacionesSeguimiento?: string[];
    fotosAntes: string[];
    fotosDespues: string[];
}
