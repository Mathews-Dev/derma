import { Injectable, inject } from '@angular/core';
import { Observable, map, from, firstValueFrom } from 'rxjs';
import { Timestamp } from 'firebase/firestore';
import { FirestoreService } from './firestore.service';
import { Turno, EstadoTurno, SlotHorario } from '../interfaces/turno.model';
import { Profesional } from '../interfaces/profesional.model';

@Injectable({
    providedIn: 'root'
})
export class TurnoService {
    private firestoreService = inject(FirestoreService);

    // ==================== CRUD ====================

    /**
     * Crear un nuevo turno
     */
    async crearTurno(turno: Partial<Turno>): Promise<string> {
        const nuevoTurno: any = {
            ...turno,
            estado: EstadoTurno.PENDIENTE,
            fechaCreacion: Timestamp.now(),
            notificacionesWhatsApp: turno.notificacionesWhatsApp ?? false
        };

        const docRef = await this.firestoreService.addDocument('turnos', nuevoTurno);
        return docRef.id;
    }

    getTurnosPorPacienteRealTime(pacienteId: string): Observable<Turno[]> {
        return this.firestoreService.getCollectionSnapshotByFilter<Turno>(
            'turnos',
            'pacienteId',
            pacienteId
        ).pipe(
            map(turnos => turnos.map(t => {
                const fecha = (t.fecha as any)?.toDate ? (t.fecha as any).toDate() : new Date(t.fecha);
                return { ...t, fecha };
            }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime()))
        );
    }

    /**
     * Obtener turnos de un paciente (Promise)
     */
    async getTurnosPorPaciente(pacienteId: string): Promise<Turno[]> {
        const turnos = await this.firestoreService.getDocumentsByFilter<Turno>(
            'turnos',
            'pacienteId',
            pacienteId
        );

        return turnos.map(t => {
            // Convertir Timestamp a Date
            const fecha = (t.fecha as any)?.toDate ? (t.fecha as any).toDate() : new Date(t.fecha);
            return {
                ...t,
                fecha: fecha
            };
        }).sort((a, b) => {
            return b.fecha.getTime() - a.fecha.getTime();
        });
    }

    /**
     * Obtener todos los turnos (para recepcionista/admin)
     */
    getTodosTurnos(): Observable<Turno[]> {
        return this.firestoreService.getCollection<Turno>('turnos').pipe(
            map(turnos => turnos.sort((a, b) => {
                const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
                const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
                return fechaB.getTime() - fechaA.getTime();
            }))
        );
    }

    /**
     * Obtener turnos de un profesional (opcionalmente filtrado por fecha)
     */
    getTurnosPorProfesional(profesionalId: string, fecha?: Date): Observable<Turno[]> {
        return this.firestoreService.getCollectionByFilter<Turno>(
            'turnos',
            'profesionalId',
            profesionalId
        ).pipe(
            map(turnos => {
                let turnosFiltrados = turnos;

                // Filtrar por fecha si se proporciona
                if (fecha) {
                    const inicioDia = new Date(fecha);
                    inicioDia.setHours(0, 0, 0, 0);

                    const finDia = new Date(fecha);
                    finDia.setHours(23, 59, 59, 999);

                    turnosFiltrados = turnos.filter(t => {
                        const fechaTurno = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha);
                        return fechaTurno >= inicioDia && fechaTurno <= finDia;
                    });
                }

                // Ordenar por hora de inicio
                return turnosFiltrados.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
            })
        );
    }

    /**
     * Actualizar estado de un turno
     */
    async actualizarEstado(turnoId: string, estado: EstadoTurno): Promise<void> {
        await this.firestoreService.updateDocument('turnos', turnoId, {
            estado,
            fechaModificacion: Timestamp.now()
        });
    }

    /**
     * Cancelar un turno
     */
    async cancelarTurno(turnoId: string, razon: string): Promise<void> {
        await this.firestoreService.updateDocument('turnos', turnoId, {
            estado: EstadoTurno.CANCELADO,
            notasPaciente: razon,
            fechaModificacion: Timestamp.now()
        });
    }

    async actualizarTurno(turnoId: string, datos: Partial<Turno>): Promise<void> {
        return this.firestoreService.updateDocument('turnos', turnoId, datos);
    }
    // ==================== REPROGRAMACIÓN ====================

    /**
     * Reprogramar un turno existente
     * Marca el turno original como REPROGRAMADO y crea uno nuevo
     */
    async reprogramarTurno(
        turnoId: string,
        nuevaFecha: Date,
        nuevaHora: string,
        motivo: string
    ): Promise<void> {
        // 1. Obtener turno original para sacar profesional y calcular fin
        const turnoOriginal = await this.firestoreService.getDocumentById<Turno>('turnos', turnoId);

        if (!turnoOriginal) {
            throw new Error('Turno no encontrado');
        }

        // 2. Calcular horaFin
        const profesional = await this.firestoreService.getDocumentById<Profesional>(
            'usuarios',
            turnoOriginal.profesionalId
        );

        const horaFin = this.calcularHoraFin(nuevaHora, profesional?.duracionConsulta || 30);

        // 3. ACTUALIZAR el turno existente (no crear uno nuevo)
        await this.firestoreService.updateDocument('turnos', turnoId, {
            fecha: Timestamp.fromDate(nuevaFecha),
            horaInicio: nuevaHora,
            horaFin: horaFin,
            estado: EstadoTurno.REPROGRAMADO, // O PENDIENTE, según regla de negocio. Dejamos Reprogramado para indicar cambio.
            motivoReprogramacion: motivo,
            fechaModificacion: Timestamp.now()
        });
    }

    // ==================== DISPONIBILIDAD ====================

    /**
     * Calcular slots disponibles para un profesional en una fecha específica
     */
    async calcularDisponibilidad(profesionalId: string, fecha: Date): Promise<SlotHorario[]> {
        // 1. Obtener datos del profesional
        const profesional = await this.firestoreService.getDocumentById<Profesional>(
            'usuarios',
            profesionalId
        );

        if (!profesional || !profesional.horariosLaborales) {
            return [];
        }

        // 2. Obtener día de la semana
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = diasSemana[fecha.getDay()] as keyof typeof profesional.horariosLaborales;

        const horariosDelDia = profesional.horariosLaborales[diaSemana];

        if (!horariosDelDia || horariosDelDia.length === 0) {
            return []; // No trabaja este día
        }

        // 3. Obtener turnos existentes para esa fecha
        const inicioDia = new Date(fecha);
        inicioDia.setHours(0, 0, 0, 0);

        const finDia = new Date(fecha);
        finDia.setHours(23, 59, 59, 999);

        // Obtener todos los turnos del profesional y filtrar por fecha client-side
        const turnosObservable = this.firestoreService.getCollectionByFilter<Turno>(
            'turnos',
            'profesionalId',
            profesionalId
        );

        const todosTurnos = await firstValueFrom(turnosObservable.pipe(
            map(turnos => turnos.filter(t => {
                const fechaTurno = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha);
                return fechaTurno >= inicioDia &&
                    fechaTurno <= finDia &&
                    (t.estado === EstadoTurno.PENDIENTE || t.estado === EstadoTurno.CONFIRMADO);
            }))
        ));

        const turnosOcupados = todosTurnos || [];

        // 4. Generar todos los slots posibles
        const duracionConsulta = profesional.duracionConsulta || 30;
        const slots: SlotHorario[] = [];

        for (const franja of horariosDelDia) {
            const slotsEnFranja = this.generarSlots(franja.horaInicio, franja.horaFin, duracionConsulta);

            // Marcar slots ocupados
            slotsEnFranja.forEach(slot => {
                const turnoEnSlot = turnosOcupados.find(t => t.horaInicio === slot.hora);

                if (turnoEnSlot) {
                    slot.disponible = false;
                    slot.turnoId = turnoEnSlot.id;
                }
            });

            slots.push(...slotsEnFranja);
        }

        return slots;
    }

    /**
     * Verificar si un slot específico está disponible
     */
    async verificarSlotDisponible(
        profesionalId: string,
        fecha: Date,
        hora: string
    ): Promise<boolean> {
        const slots = await this.calcularDisponibilidad(profesionalId, fecha);
        const slot = slots.find(s => s.hora === hora);
        return slot?.disponible ?? false;
    }

    // ==================== WHATSAPP ====================

    /**
     * Actualizar preferencias de notificación WhatsApp
     */
    async actualizarPreferenciasNotificacion(
        turnoId: string,
        habilitado: boolean,
        telefono?: string
    ): Promise<void> {
        await this.firestoreService.updateDocument('turnos', turnoId, {
            notificacionesWhatsApp: habilitado,
            telefonoNotificaciones: telefono,
            fechaModificacion: Timestamp.now()
        });
    }

    // ==================== HELPERS ====================

    /**
     * Generar slots de tiempo entre dos horas
     */
    private generarSlots(horaInicio: string, horaFin: string, intervalo: number): SlotHorario[] {
        const slots: SlotHorario[] = [];

        const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number);
        const [horaFinH, horaFinM] = horaFin.split(':').map(Number);

        let minutosActuales = horaInicioH * 60 + horaInicioM;
        const minutosFinales = horaFinH * 60 + horaFinM;

        while (minutosActuales < minutosFinales) {
            const horas = Math.floor(minutosActuales / 60);
            const minutos = minutosActuales % 60;

            const horaFormateada = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;

            slots.push({
                hora: horaFormateada,
                disponible: true
            });

            minutosActuales += intervalo;
        }

        return slots;
    }

    /**
     * Calcular hora de fin sumando duración a hora de inicio
     */
    private calcularHoraFin(horaInicio: string, duracion: number): string {
        const [horas, minutos] = horaInicio.split(':').map(Number);
        const minutosTotal = horas * 60 + minutos + duracion;

        const horasFin = Math.floor(minutosTotal / 60);
        const minutosFin = minutosTotal % 60;

        return `${horasFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}`;
    }
}
