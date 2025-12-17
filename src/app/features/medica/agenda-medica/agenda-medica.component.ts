import { Component, inject, OnInit, signal, effect, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from "@schedule-x/angular";
import { createCalendar, createViewDay, createViewWeek, createViewMonthGrid, createViewMonthAgenda, CalendarApp } from "@schedule-x/calendar";
// import { createEventModalPlugin } from '@schedule-x/event-modal'; // Removed default modal
import { createCurrentTimePlugin } from '@schedule-x/current-time';
import { createScrollControllerPlugin } from '@schedule-x/scroll-controller';
import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls';
import '@schedule-x/theme-default/dist/index.css';
import 'temporal-polyfill/global';
import { TurnoService } from '../../../core/services/turno.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { AuthService } from '../../../core/services/auth.service';
import { EstadoTurno } from '../../../core/interfaces/turno.model';

declare const Temporal: any;

@Component({
  selector: 'app-agenda-medica',
  standalone: true,
  imports: [CommonModule, CalendarComponent],
  templateUrl: './agenda-medica.component.html',
  styleUrl: './agenda-medica.component.css'
})
export class AgendaMedicaComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthService);
  private router = inject(Router);

  calendarControls = createCalendarControlsPlugin();
  private isMobile = window.innerWidth < 768;

  @HostListener('window:resize')
  onResize() {
    const newIsMobile = window.innerWidth < 768;

    // Si pasamos de móvil (true) a escritorio (false), forzamos vista semanal
    if (this.isMobile && !newIsMobile) {
      console.log('🔄 Cambiando a vista de escritorio (Week)...');
      this.calendarControls.setView('week');
    }

    this.isMobile = newIsMobile;
  }



  calendarApp = signal<CalendarApp | null>(null);
  selectedEvent = signal<any>(null);
  isModalOpen = signal<boolean>(false);

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedEvent.set(null);
  }

  iniciarConsulta() {
    const event = this.selectedEvent();
    if (!event) return;
    console.log('🚀 Iniciar consulta para:', event);
    this.closeModal();
    this.router.navigate(['/medica/consulta', event.id]);
  }

  marcarAusente() {
    const event = this.selectedEvent();
    if (!event) return;
    console.log('🚫 Marcar ausente:', event);
    // TODO: Actualizar estado en Firebase
  }

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        console.log('🔍 Usuario detectado (effect):', user);
        this.cargarTurnos(user);
      } else {
        console.log('⏳ Esperando datos del usuario...');
      }
    });
  }

  ngOnInit(): void {
    // La carga se maneja via effect
  }

  cargarTurnos(user: any) {
    // Si viene por argumento, usamos ese.
    console.log('🔍 Usuario actual:', user);

    console.log('📡 Cargando turnos para profesional:', user.uid);
    this.turnoService.getTurnosPorProfesional(user.uid).subscribe({
      next: async (turnos) => {
        console.log('✅ Turnos recibidos:', turnos);

        // 1. Obtener IDs únicos de pacientes
        const pacienteIds = [...new Set(turnos.map(t => t.pacienteId))];

        // 2. Crear mapa de nombres
        const nombresPacientes = new Map<string, string>();

        // 3. Buscar nombres en Firestore (Usuarios)
        await Promise.all(pacienteIds.map(async (id) => {
          try {
            const paciente = await this.firestoreService.getDocumentById<any>('usuarios', id);
            if (paciente) {
              nombresPacientes.set(id, `${paciente.nombre} ${paciente.apellido}`);
            }
          } catch (e) {
            console.error(`Error al cargar paciente ${id}`, e);
          }
        }));

        const events = turnos
          .filter(t => t.estado !== EstadoTurno.CANCELADO)
          .map(t => {
            // Convertir fecha y hora a string YYYY-MM-DD HH:mm
            const fechaObj = (t.fecha as any)?.toDate ? (t.fecha as any).toDate() : new Date(t.fecha);
            const yyyy = fechaObj.getFullYear();
            const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
            const dd = String(fechaObj.getDate()).padStart(2, '0');

            const dateStr = `${yyyy}-${mm}-${dd}`;

            // Crear Temporal ZonedDateTime
            const startISO = `${dateStr}T${t.horaInicio}`;
            const endISO = `${dateStr}T${t.horaFin}`;
            const timeZone = Temporal.Now.timeZoneId();

            const description = `
Motivo: ${t.motivo || 'Sin motivo'}
Estado: ${t.estado.toUpperCase()}
Contacto: ${t.telefonoNotificaciones || 'No registrado'}
`.trim();

            const nombrePaciente = nombresPacientes.get(t.pacienteId) || 'Paciente';

            return {
              id: t.id!,
              title: `${nombrePaciente} (${t.estado})`,
              start: Temporal.PlainDateTime.from(startISO).toZonedDateTime(timeZone),
              end: Temporal.PlainDateTime.from(endISO).toZonedDateTime(timeZone),
              description: description,
              // Extra fields for Modal
              estado: t.estado,
              pacienteId: t.pacienteId,
              motivo: t.motivo || 'Sin motivo',
              telefono: t.telefonoNotificaciones || 'No registrado',
              nombre: nombrePaciente,
              // Native Dates for Angular Pipes
              startNative: new Date(startISO),
              endNative: new Date(endISO)
            };
          });

        console.log('📅 Eventos creados:', events);
        this.initCalendar(events);
      },
      error: (error) => {
        console.error('❌ Error al cargar turnos:', error);
      }
    });
  }

  initCalendar(events: any[]) {
    console.log('🎨 Inicializando calendario con eventos:', events);

    try {
      // Crear plugins
      const scrollController = createScrollControllerPlugin({
        initialScroll: '08:00' // Scroll inicial a las 8 AM
      });

      const calendar = createCalendar({
        locale: 'es-ES',
        timezone: Temporal.Now.timeZoneId(),
        views: [
          createViewWeek(),
          createViewDay(),
          createViewMonthGrid(),
          createViewMonthAgenda(),
        ],
        events: events,
        selectedDate: Temporal.Now.plainDateISO(),
        dayBoundaries: {
          start: '08:00',
          end: '20:00',
        },
        weekOptions: {
          gridHeight: 1200, // 👈 Aumenta un poco para que se vea mejor con más líneas
          timeAxisFormatOptions: { hour: '2-digit', minute: '2-digit' },
          nDays: 7,
          gridStep: 30
        },

        plugins: [
          // createEventModalPlugin(), // 👈 Deshabilitado para usar modal propio
          createCurrentTimePlugin(),
          this.calendarControls,

          scrollController
        ],
        callbacks: {
          onEventClick: (calendarEvent) => {
            console.log('Event clicked:', calendarEvent);
            this.selectedEvent.set(calendarEvent);
            this.isModalOpen.set(true);
          }
        }
      });

      console.log('✅ Calendario creado:', calendar);
      this.calendarApp.set(calendar);
      console.log('✅ Signal actualizado, calendarApp:', this.calendarApp());
    } catch (error) {
      console.error('❌ Error al crear calendario:', error);
    }
  }
}
