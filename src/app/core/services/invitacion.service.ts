import { inject, Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { SolicitudInvitacion } from '../interfaces/solicitud-invitacion.model';

import { Timestamp } from "@angular/fire/firestore";

@Injectable({
  providedIn: 'root'
})
export class InvitacionService {
  private firestore = inject(FirestoreService);

  // Generar una invitación (solo admin)
  async generarInvitacion(
    rol: 'empleado' | 'recepcionista' | 'dermatologo' | 'admin',
    creadoPor?: string
  ): Promise<string> {
    const codigo = this.generarCodigoAleatorio();

    const invitacion: SolicitudInvitacion = {
      codigo,

      rol,
      fechaCreacion: Timestamp.now(),
      fechaExpiracion: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)), // 30 minutos
      usado: false,
      creadoPor: creadoPor || 'admin'
    };

    await this.firestore.setDocument('invitaciones', codigo, invitacion);

    const baseUrl = window.location.origin;
    return `${baseUrl}/invite/${codigo}`;
  }

  // Validar una invitación
  async validarInvitacion(codigo: string): Promise<SolicitudInvitacion> {
    try {
      const invitacion = await this.firestore.getDocument<SolicitudInvitacion>(
        'invitaciones',
        codigo
      );

      if (!invitacion) {
        throw new Error('Código de invitación inválido');
      }

      if (invitacion.usado) {
        throw new Error('Este código ya ha sido utilizado');
      }

      // Comparar timestamps
      const ahora = Timestamp.now();
      if (ahora.toDate() > invitacion.fechaExpiracion.toDate()) {
        throw new Error('El código de invitación ha expirado');
      }

      return invitacion;
    } catch (error: any) {
      throw new Error(error.message || 'Error validando la invitación');
    }
  }

  // Marcar invitación como usada
  async marcarInvitacionComoUsada(codigo: string, usadoPor: string): Promise<void> {
    await this.firestore.updateDocument('invitaciones', codigo, {
      usado: true,
      usadoPor,
      fechaUso: Timestamp.now()
    });
  }

  // Generar código aleatorio
  private generarCodigoAleatorio(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }
}
