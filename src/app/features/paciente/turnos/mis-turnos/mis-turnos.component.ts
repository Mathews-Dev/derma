import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TurnoService } from '../../../../core/services/turno.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { Turno, EstadoTurno } from '../../../../core/interfaces/turno.model';
import { Profesional } from '../../../../core/interfaces/profesional.model';

@Component({
  selector: 'app-mis-turnos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-turnos.component.html',
  styleUrl: './mis-turnos.component.css'
})
export class MisTurnosComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  private router = inject(Router);

  // Estado
  turnos = signal<Turno[]>([]);
  profesionalesCache = new Map<string, Profesional>();
  isLoading = signal<boolean>(true);
  EstadoTurno = EstadoTurno; // Para usar en template

  // Tabs
  filtroActual = signal<'proximos' | 'historial'>('proximos');

  ngOnInit(): void {
    this.cargarTurnos();
  }

  async cargarTurnos(): Promise<void> {
    const usuario = this.authService.currentUser();
    if (!usuario) return;

    this.isLoading.set(true);
    try {
      const turnos = await this.turnoService.getTurnosPorPaciente(usuario.uid).toPromise();

      if (turnos) {
        this.turnos.set(turnos);
        await this.cargarProfesionales(turnos);
      }
    } catch (error) {
      console.error('Error cargando turnos:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async cargarProfesionales(turnos: Turno[]): Promise<void> {
    const idsUnicos = [...new Set(turnos.map(t => t.profesionalId))];

    for (const id of idsUnicos) {
      if (!this.profesionalesCache.has(id)) {
        const profesional = await this.firestoreService.getDocumentById<Profesional>('usuarios', id);
        if (profesional) {
          this.profesionalesCache.set(id, profesional);
        }
      }
    }
  }

  getTurnosFiltrados(): Turno[] {
    const ahora = new Date();
    // Normalizar hora para comparaciones justas
    ahora.setHours(0, 0, 0, 0);

    return this.turnos().filter(turno => {
      const fechaTurno = turno.fecha?.toDate ? turno.fecha.toDate() : new Date(turno.fecha);

      if (this.filtroActual() === 'proximos') {
        return fechaTurno >= ahora &&
          [EstadoTurno.PENDIENTE, EstadoTurno.CONFIRMADO, EstadoTurno.REPROGRAMADO].includes(turno.estado);
      } else {
        return fechaTurno < ahora ||
          [EstadoTurno.COMPLETADO, EstadoTurno.CANCELADO, EstadoTurno.NO_ASISTIO].includes(turno.estado);
      }
    });
  }

  getProfesional(id: string): Profesional | undefined {
    return this.profesionalesCache.get(id);
  }

  async cancelarTurno(turno: Turno): Promise<void> {
    if (!confirm('¿Estás seguro que deseas cancelar este turno?')) return;

    try {
      await this.turnoService.cancelarTurno(turno.id, 'Cancelado por el paciente');
      await this.cargarTurnos(); // Recargar lista
    } catch (error) {
      console.error('Error al cancelar:', error);
      alert('Error al cancelar el turno');
    }
  }

  sacarTurno(): void {
    this.router.navigate(['/paciente/sacar-turno']);
  }

  reprogramar(turno: Turno): void {
    this.router.navigate(['/paciente/reprogramar', turno.id]);
  }

  // Helpers de estado para estilos
  getEstadoClass(estado: EstadoTurno): string {
    const base = 'px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (estado) {
      case EstadoTurno.PENDIENTE: return `${base} bg-yellow-100 text-yellow-800`;
      case EstadoTurno.CONFIRMADO: return `${base} bg-emerald-100 text-emerald-800`;
      case EstadoTurno.REPROGRAMADO: return `${base} bg-blue-100 text-blue-800`;
      case EstadoTurno.CANCELADO: return `${base} bg-red-100 text-red-800`;
      case EstadoTurno.COMPLETADO: return `${base} bg-gray-100 text-gray-800`;
      default: return `${base} bg-gray-100 text-gray-800`;
    }
  }
}
