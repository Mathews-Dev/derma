import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { TurnoService } from '../../../../core/services/turno.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { Paciente } from '../../../../core/interfaces/paciente.model';
import { Turno, EstadoTurno } from '../../../../core/interfaces/turno.model';
import { Profesional } from '../../../../core/interfaces/profesional.model';

@Component({
  selector: 'app-dashboard-paciente',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-paciente.component.html',
  styleUrl: './dashboard-paciente.component.css'
})
export class DashboardPacienteComponent {
  private authService = inject(AuthService);
  private turnoService = inject(TurnoService);
  private firestoreService = inject(FirestoreService);

  // User State
  currentUser = computed(() => this.authService.currentUser() as Paciente | undefined);

  // Turno State
  proximoTurno = signal<Turno | null>(null);
  profesionalTurno = signal<Profesional | null>(null);
  isLoadingTurno = signal<boolean>(true);

  // Example Derived State (Mocked)
  rutinaManana = computed(() => this.currentUser()?.rutina?.manana || []);
  rutinaNoche = computed(() => this.currentUser()?.rutina?.noche || []);

  // Just a simple logic to show "3 of 5 products applied" (mocked active state)
  totalProducts = computed(() => this.rutinaManana().length + this.rutinaNoche().length);

  textoFecha = computed(() => {
    const turno = this.proximoTurno();
    if (!turno) return '';

    const fecha = turno.fecha instanceof Date ? turno.fecha : (turno.fecha as any).toDate();
    const hoy = new Date();
    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    if (isSameDay(fecha, hoy)) {
      return 'Hoy';
    } else if (isSameDay(fecha, manana)) {
      return 'Mañana';
    } else {
      // Formato: "Lunes, 22 de Diciembre"
      const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
      const texto = new Intl.DateTimeFormat('es-ES', opciones).format(fecha);
      // Capitalizar primera letra y agregar 'de' si hace falta (Intl suele poner '22 de diciembre' en ES)
      return texto.charAt(0).toUpperCase() + texto.slice(1);
    }
  });

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.cargarProximoTurno(user.uid);
      }
    });
  }

  async cargarProximoTurno(uid: string) {
    try {
      this.isLoadingTurno.set(true);
      const turnos = await this.turnoService.getTurnosPorPaciente(uid);

      const ahora = new Date();
      // Filtrar futuros y activos
      const turnosFuturos = turnos.filter(t => {
        const fecha = t.fecha instanceof Date ? t.fecha : (t.fecha as any).toDate();
        return fecha > ahora && [EstadoTurno.PENDIENTE, EstadoTurno.CONFIRMADO, EstadoTurno.REPROGRAMADO].includes(t.estado);
      });

      // Ordenar por fecha ascendente (el más cercano primero)
      turnosFuturos.sort((a, b) => {
        const fechaA = a.fecha instanceof Date ? a.fecha : (a.fecha as any).toDate();
        const fechaB = b.fecha instanceof Date ? b.fecha : (b.fecha as any).toDate();
        return fechaA.getTime() - fechaB.getTime();
      });

      if (turnosFuturos.length > 0) {
        const proximo = turnosFuturos[0];
        // Normalizar fecha
        const fechaNorm = proximo.fecha instanceof Date ? proximo.fecha : (proximo.fecha as any).toDate();
        this.proximoTurno.set({ ...proximo, fecha: fechaNorm });

        // Cargar profesional
        const prof = await this.firestoreService.getDocumentById<Profesional>('usuarios', proximo.profesionalId);
        if (prof) {
          this.profesionalTurno.set(prof);
        }
      } else {
        this.proximoTurno.set(null);
      }

    } catch (error) {
      console.error('Error cargando próximo turno:', error);
    } finally {
      this.isLoadingTurno.set(false);
    }
  }
}
