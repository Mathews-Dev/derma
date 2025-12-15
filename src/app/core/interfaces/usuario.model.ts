export enum RolUsuario {
    ADMIN = 'admin',
    DERMATOLOGO = 'dermatologo',
    RECEPCIONISTA = 'recepcionista',
    PACIENTE = 'paciente',
    EMPLEADO = 'empleado'
}

export enum EstadoUsuario {
    ACTIVO = 'activo',
    INACTIVO = 'inactivo',
    SUSPENDIDO = 'suspendido'
}


export interface Usuario {
    uid: string;
    email: string;
    nombre: string;
    apellido: string;
    dni?: string;
    telefono: string;
    fotoPerfil?: string; // base64
    rol: RolUsuario;
    estado: EstadoUsuario;
    correoVerificado: boolean;
    tituloProfesional?: string; // Optional for base user, required/used by Professionals
}


export interface FranjaHoraria {
    horaInicio: string;
    horaFin: string;
}

export interface HorariosLaborales {
    lunes?: FranjaHoraria[];
    martes?: FranjaHoraria[];
    miercoles?: FranjaHoraria[];
    jueves?: FranjaHoraria[];
    viernes?: FranjaHoraria[];
    sabado?: FranjaHoraria[];
    domingo?: FranjaHoraria[];
}

export interface HonorariosPorTratamiento {
    idEspecialidad: string;
    nombre: string;
    precio: number;
}


export interface DocumentosProfesional {
    dniFrente?: string; // base64
    dniReverso?: string; // base64
    matriculaNacional?: string; // base64
    matriculaProvincial?: string; // base64
    diploma?: string; // base64
}

export interface Profesional extends Usuario {
    numeroMatriculaNacional: string;
    numeroMatriculaProvincial: string;
    tituloProfesional: string; // Ej: Cirujano Plástico

    horariosLaborales: HorariosLaborales;
    duracionConsulta: number; // minutos
    honorarios: HonorariosPorTratamiento[];
    documentos?: DocumentosProfesional;
}
