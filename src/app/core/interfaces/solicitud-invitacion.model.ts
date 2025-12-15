import { Timestamp } from "@angular/fire/firestore";


export interface SolicitudInvitacion {
    codigo: string;

    rol: 'empleado' | 'recepcionista' | 'dermatologo' | 'admin';
    fechaCreacion: Timestamp;
    fechaExpiracion: Timestamp;
    usado: boolean;
    creadoPor: string;
    usadoPor?: string;
    fechaUso?: Date;
}