import { Usuario } from "./usuario.model";

export enum GeneroPaciente {
    MASCULINO = 'masculino',
    FEMENINO = 'femenino',
    OTRO = 'otro'
}

export enum TipoPiel {
    GRASA = 'grasa',
    SECA = 'seca',
    MIXTA = 'mixta',
    SENSIBLE = 'sensible',
    NORMAL = 'normal'
}

export enum BiotipoCutaneo {
    GRASO = 'graso',
    SECO = 'seco',
    MIXTO = 'mixto',
    NORMAL = 'normal'
}

export enum Fototipo {
    I = 'I',
    II = 'II',
    III = 'III',
    IV = 'IV',
    V = 'V',
    VI = 'VI'
}

export interface ProductoSkincare {
    nombre: string;
    tipo: 'limpiador' | 'tonico' | 'serum' | 'crema' | 'protector' | 'contorno' | 'otro';
    frecuencia?: string;
    imagenUrl?: string;
}

export interface RutinaSkincare {
    manana: ProductoSkincare[];
    noche: ProductoSkincare[];
    semanal: ProductoSkincare[]; // exfoliantes, mascarillas
}

export interface Alergia {
    nombre: string;
    tipo: 'medicamento' | 'ingrediente' | 'otro';
    severidad: 'leve' | 'moderada' | 'grave';
}

export interface Consentimiento {
    id: string;
    titulo: string;
    fechaFirma: Date;
    archivoUrl: string; // Foto del documento físico firmado
    tipoTratamiento?: string;
    pacienteId?: string; // Optional for now to avoid breaking other usages, or string if mandatory
}

export interface PerfilEstetico {
    biotipo: TipoPiel;
    fototipo: Fototipo;
    tipoSangre?: 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-'; // Requerido para PRP/Cirugías
    preocupaciones: string[]; // Manchas, Arrugas, Acné, etc.
    objetivos: string[]; // "Mejorar luminosidad", "Tratar cicatrices"
}

export interface FichaMedicaReducida {
    alergias: Alergia[];
    medicamentosActuales: string[]; // Listado simple de lo que toma
    antecedentesEsteticos: string[]; // Botox previo, Rellenos, Hilos
    cicatrizacion: 'normal' | 'queloide' | 'atrofica';
    embarazoLactancia: boolean;
}

export interface ImagenArchivo {
    public_id: string;
    secure_url: string;
}

export interface Paciente extends Usuario {
    fechaNacimiento: Date;
    edad: number;
    genero: GeneroPaciente;
    direccion: string;
    ciudad: string;

    // Galería Visual (Antes/Después)
    imagenes: ImagenArchivo[];

    // Datos Estéticos y Rutina (Core del sistema)
    perfilEstetico: PerfilEstetico;
    rutina: RutinaSkincare;

    // Legal
    consentimientos: Consentimiento[];

    // Datos Médicos Simplificados (Seguridad)
    fichaMedica: FichaMedicaReducida;

    // Historial
    historialCitas: string[]; // array de idCita
    historiaClinicaAcceso: boolean; // true si tiene acceso
}