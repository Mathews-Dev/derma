import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from "@schedule-x/angular";
import { createCalendar, createViewDay, createViewWeek, createViewMonthGrid, createViewMonthAgenda, CalendarApp } from "@schedule-x/calendar";
import { createEventModalPlugin } from '@schedule-x/event-modal';
import { createCurrentTimePlugin } from '@schedule-x/current-time';
import { createScrollControllerPlugin } from '@schedule-x/scroll-controller';
import '@schedule-x/theme-default/dist/index.css';
import 'temporal-polyfill/global';
import { TurnoService } from '../../../core/services/turno.service';
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
  private authService = inject(AuthService);

  calendarApp = signal<CalendarApp | null>(null);

  ngOnInit(): void {
    this.cargarTurnos();
  }

  cargarTurnos() {
    const user = this.authService.currentUser();
    console.log('🔍 Usuario actual:', user);
    if (!user) {
      console.log('❌ No hay usuario logueado');
      return;
    }

    console.log('📡 Cargando turnos para profesional:', user.uid);
    this.turnoService.getTurnosPorProfesional(user.uid).subscribe({
      next: (turnos) => {
        console.log('✅ Turnos recibidos:', turnos);

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

            return {
              id: t.id!,
              title: `Consulta`,
              start: Temporal.PlainDateTime.from(startISO).toZonedDateTime(timeZone),
              end: Temporal.PlainDateTime.from(endISO).toZonedDateTime(timeZone),
              description: t.motivo || 'Sin motivo',
              estado: t.estado,
              pacienteId: t.pacienteId
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
        plugins: [
          createEventModalPlugin(),
          createCurrentTimePlugin(),
          scrollController
        ],
        callbacks: {
          onEventClick(calendarEvent) {
            console.log('Event clicked:', calendarEvent);
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
