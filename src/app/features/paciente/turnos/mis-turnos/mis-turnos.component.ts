import { Component, OnInit, inject, signal, effect, computed } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TurnoService } from '../../../../core/services/turno.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { Turno, EstadoTurno } from '../../../../core/interfaces/turno.model';
import { Profesional } from '../../../../core/interfaces/profesional.model';
import { switchMap, tap, filter } from 'rxjs';

@Component({
  selector: 'app-mis-turnos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-turnos.component.html',
  styleUrl: './mis-turnos.component.css'
})
export class MisTurnosComponent implements OnInit {
  private turnoService = inject(TurnoService);
  public authService = inject(AuthService); // Public for toObservable
  private firestoreService = inject(FirestoreService);
  private router = inject(Router);

  // Estado
  profesionalesCache = new Map<string, Profesional>();
  isLoading = signal<boolean>(true);
  EstadoTurno = EstadoTurno; // Para usar en template

  // Tabs
  filtroActual = signal<'proximos' | 'historial'>('proximos');

  // 🔥 SIGNAL EN TIEMPO REAL
  turnos = toSignal(
    toObservable(this.authService.currentUser).pipe(
      filter(user => !!user),
      tap(() => this.isLoading.set(true)),
      switchMap(user => this.turnoService.getTurnosPorPacienteRealTime(user!.uid)),
      tap(turnos => {
        console.log('📡 Turnos actualizados en tiempo real:', turnos);
        this.cargarProfesionales(turnos);
        this.isLoading.set(false);
      })
    ),
    { initialValue: [] }
  );

  ngOnInit(): void {
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
    ahora.setHours(0, 0, 0, 0);

    return this.turnos().filter(turno => {
      // Safety check: Ensure fecha is a Date object (handled in service, but double check)
      const fechaTurno = turno.fecha instanceof Date ? turno.fecha : new Date(turno.fecha);

      // DEBUG: Mostrar todo por estado, ignorando fecha temporalmente para ver si aparecen
      if (this.filtroActual() === 'proximos') {
        // return fechaTurno >= ahora && ...
        return [EstadoTurno.PENDIENTE, EstadoTurno.CONFIRMADO, EstadoTurno.REPROGRAMADO].includes(turno.estado);
      } else {
        // return fechaTurno < ahora || ...
        return [EstadoTurno.COMPLETADO, EstadoTurno.CANCELADO, EstadoTurno.NO_ASISTIO].includes(turno.estado);
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
      //await this.cargarTurnos();// // Recargar lista
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
    const base = 'text-[10px] uppercase tracking-widest font-bold';
    switch (estado) {
      case EstadoTurno.PENDIENTE: return `${base} text-black`;
      case EstadoTurno.CONFIRMADO: return `${base} text-black`;
      case EstadoTurno.REPROGRAMADO: return `${base} text-gray-800`;
      case EstadoTurno.CANCELADO: return `${base} text-gray-400 line-through decoration-gray-400`;
      case EstadoTurno.COMPLETADO: return `${base} text-gray-500`;
      default: return `${base} text-gray-500`;
    }
  }
}
