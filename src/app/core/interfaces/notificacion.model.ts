export interface Notificacion {
    id: string;
    pacienteId: string;
    tipo: 'cita' | 'recordatorio' | 'confirmacion' | 'promocion' | 'mensaje' | 'resultado';
    titulo: string;
    mensaje: string;
    fecha: Date;
    leida: boolean;
    importante: boolean;
    accionUrl?: string;
    accionTexto?: string;
    relacionadoId?: string; // ID de cita, tratamiento, etc.
    relacionadoTipo?: 'cita' | 'tratamiento' | 'pago';
}

export interface ConfiguracionNotificaciones {
    pacienteId: string;
    email: boolean;
    sms: boolean;
    push: boolean;
    recordatoriosCitas: boolean;
    confirmaciones: boolean;
    promociones: boolean;
    mensajesProfesional: boolean;
    resultados: boolean;
}
