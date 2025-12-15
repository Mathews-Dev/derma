import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TurnoData {
    pacienteNombre: string;
    telefonoWhatsApp: string;
    fecha: string;
    hora: string;
    doctor: string;
}

export interface RespuestaEnvio {
    success: boolean;
    message?: string;
    error?: string;
}

@Injectable({
    providedIn: 'root'
})
export class WhatsappService {
    private http = inject(HttpClient);
    private apiUrl = 'https://tasty-bonobo-unju-d6953079.koyeb.app/api/send-whatsapp';

    enviarConfirmacionTurno(turno: TurnoData): Observable<RespuestaEnvio> {
        const mensaje = this.construirMensajeConfirmacion(turno);
        return this.enviarMensaje(turno.telefonoWhatsApp, mensaje);
    }

    enviarRecordatorio(turno: TurnoData): Observable<RespuestaEnvio> {
        const mensaje = this.construirMensajeRecordatorio(turno);
        return this.enviarMensaje(turno.telefonoWhatsApp, mensaje);
    }

    enviarCambioTurno(turno: TurnoData): Observable<RespuestaEnvio> {
        const mensaje = this.construirMensajeCambio(turno);
        return this.enviarMensaje(turno.telefonoWhatsApp, mensaje);
    }

    enviarCancelacionTurno(turno: TurnoData, razon?: string): Observable<RespuestaEnvio> {
        const mensaje = this.construirMensajeCancelacion(turno, razon);
        return this.enviarMensaje(turno.telefonoWhatsApp, mensaje);
    }

    private enviarMensaje(telefono: string, mensaje: string): Observable<RespuestaEnvio> {
        const payload = {
            phoneNumber: telefono,
            message: mensaje
        };
        return this.http.post<RespuestaEnvio>(this.apiUrl, payload);
    }

    private construirMensajeConfirmacion(turno: TurnoData): string {
        return `✅ *Confirmación de Turno*\n\n` +
            `Hola ${turno.pacienteNombre},\n\n` +
            `Tu turno ha sido confirmado:\n` +
            `📅 Fecha: ${turno.fecha}\n` +
            `🕐 Hora: ${turno.hora}\n` +
            `👨‍⚕️ Doctor: ${turno.doctor}\n\n` +
            `Por favor, llega 10 minutos antes.\n` +
            `Gracias.`;
    }

    private construirMensajeRecordatorio(turno: TurnoData): string {
        return `⏰ *Recordatorio de Turno*\n\n` +
            `Hola ${turno.pacienteNombre},\n\n` +
            `Te recordamos tu turno:\n` +
            `📅 Hoy a las ${turno.hora}\n` +
            `👨‍⚕️ Doctor: ${turno.doctor}\n\n` +
            `¡No olvides asistir!`;
    }

    private construirMensajeCambio(turno: TurnoData): string {
        return `🔄 *Cambio de Turno*\n\n` +
            `Hola ${turno.pacienteNombre},\n\n` +
            `Tu turno ha sido reprogramado:\n` +
            `📅 Nueva Fecha: ${turno.fecha}\n` +
            `🕐 Nueva Hora: ${turno.hora}\n` +
            `👨‍⚕️ Doctor: ${turno.doctor}\n\n` +
            `Por favor confirma si te viene bien.`;
    }

    private construirMensajeCancelacion(turno: TurnoData, razon?: string): string {
        return `❌ *Turno Cancelado*\n\n` +
            `Hola ${turno.pacienteNombre},\n\n` +
            `Lamentablemente tu turno ha sido cancelado:\n` +
            `📅 Fecha: ${turno.fecha}\n` +
            `🕐 Hora: ${turno.hora}\n` +
            `👨‍⚕️ Doctor: ${turno.doctor}\n\n` +
            (razon ? `📝 Motivo: ${razon}\n\n` : '') +
            `Por favor contactanos para reprogramar.\n` +
            `Disculpa las molestias.`;
    }
}
