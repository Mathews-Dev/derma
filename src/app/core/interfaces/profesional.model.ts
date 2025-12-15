import { Usuario, HorariosLaborales, HonorariosPorTratamiento } from "./usuario.model";

// Interfaces moved to usuario.model.ts to avoid duplication


export interface Profesional extends Usuario {
    numeroMatriculaNacional: string;
    numeroMatriculaProvincial: string;
    tituloProfesional: string; // Ej: Cirujano Plástico, Dermatóloga Clínica
    horariosLaborales: HorariosLaborales;
    duracionConsulta: number; // minutos
    honorarios: HonorariosPorTratamiento[];
}


export interface DocumentosProfesional {
    dniFrente?: string; // base64
    dniReverso?: string; // base64
    matriculaNacional?: string; // base64
    matriculaProvincial?: string; // base64
    diploma?: string; // base64
}
