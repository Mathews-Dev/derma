export interface SesionTratamiento {
    id: string;
    tratamientoPacienteId: string;  // Referencia al TratamientoPaciente
    turnoId: string;                // Referencia al Turno de esta sesión
    pacienteId: string;
    profesionalId: string;

    // Identificación de la sesión
    numeroSesion: number;           // 1, 2, 3, etc.
    fecha: Date;

    // Detalles del procedimiento
    procedimientoRealizado: string;
    productosUsados: ProductoUsado[];

    // Observaciones
    notasProfesional: string;
    reaccionPaciente?: string;      // Cómo reaccionó durante/después
    efectosSecundarios?: string[];

    // Documentación
    fotosIds: string[];             // Referencias a FotoProgreso

    // Instrucciones
    instruccionesPostSesion: string[];
    proximaSesionProgramada?: Date;

    // Estado
    completada: boolean;
    duracionMinutos?: number;

    createdAt: Date;
}

export interface ProductoUsado {
    nombre: string;
    marca?: string;
    cantidad?: string;
}
