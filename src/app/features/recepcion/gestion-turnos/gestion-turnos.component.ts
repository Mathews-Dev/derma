import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TurnoService } from '../../../core/services/turno.service';
import { WhatsappService, TurnoData } from '../../../core/services/whatsapp.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Turno, EstadoTurno } from '../../../core/interfaces/turno.model';
import { Profesional } from '../../../core/interfaces/profesional.model';
import { Paciente } from '../../../core/interfaces/paciente.model';

@Component({
  selector: 'app-gestion-turnos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion-turnos.component.html',
  styleUrl: './gestion-turnos.component.css'
})
export class GestionTurnosComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private whatsappService = inject(WhatsappService);
  private firestoreService = inject(FirestoreService);

  // Estado
  turnos = signal<Turno[]>([]);
  isLoading = signal(true);
  filtroEstado = signal<EstadoTurno | 'todos'>('todos');
  EstadoTurno = EstadoTurno;

  // Cache
  profesionalesCache = new Map<string, Profesional>();
  pacientesCache = new Map<string, Paciente>();

  // Acciones en proceso
  procesando = signal<string | null>(null);

  // Filtros computados
  turnosFiltrados = computed(() => {
    const todos = this.turnos();
    const filtro = this.filtroEstado();

    if (filtro === 'todos') return todos;
    return todos.filter(t => t.estado === filtro);
  });

  // Contadores
  contadores = computed(() => ({
    todos: this.turnos().length,
    pendientes: this.turnos().filter(t => t.estado === EstadoTurno.PENDIENTE).length,
    confirmados: this.turnos().filter(t => t.estado === EstadoTurno.CONFIRMADO).length,
    cancelados: this.turnos().filter(t => t.estado === EstadoTurno.CANCELADO).length
  }));

  ngOnInit(): void {
    this.cargarTurnos();
  }

  private cargarTurnos(): void {
    this.isLoading.set(true);
    this.turnoService.getTodosTurnos().subscribe({
      next: (turnos) => {
        this.turnos.set(turnos);
        this.cargarDatosRelacionados(turnos);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando turnos:', err);
        this.isLoading.set(false);
      }
    });
  }

  private async cargarDatosRelacionados(turnos: Turno[]): Promise<void> {
    const profesionalIds = [...new Set(turnos.map(t => t.profesionalId))];
    const pacienteIds = [...new Set(turnos.map(t => t.pacienteId))];

    // Cargar profesionales
    for (const id of profesionalIds) {
      if (!this.profesionalesCache.has(id)) {
        try {
          const prof = await this.firestoreService.getDocument<Profesional>('profesionales', id);
          if (prof) this.profesionalesCache.set(id, prof);
        } catch (e) { console.error(e); }
      }
    }

    // Cargar pacientes
    for (const id of pacienteIds) {
      if (!this.pacientesCache.has(id)) {
        try {
          const pac = await this.firestoreService.getDocument<Paciente>('pacientes', id);
          if (pac) this.pacientesCache.set(id, pac);
        } catch (e) { console.error(e); }
      }
    }
  }

  // Getters para template
  getProfesional(id: string): Profesional | undefined {
    return this.profesionalesCache.get(id);
  }

  getPaciente(id: string): Paciente | undefined {
    return this.pacientesCache.get(id);
  }

  formatFecha(fecha: any): string {
    if (!fecha) return '-';
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // Acciones
  async confirmarTurno(turno: Turno): Promise<void> {
    if (!confirm('¿Confirmar este turno? Se enviará un WhatsApp al paciente.')) return;

    this.procesando.set(turno.id);

    try {
      // Cambiar estado
      await this.turnoService.actualizarEstado(turno.id, EstadoTurno.CONFIRMADO);

      // Enviar WhatsApp si tiene teléfono
      if (turno.notificacionesWhatsApp && turno.telefonoNotificaciones) {
        const paciente = this.getPaciente(turno.pacienteId);
        const profesional = this.getProfesional(turno.profesionalId);

        const turnoData: TurnoData = {
          pacienteNombre: paciente?.nombre || 'Paciente',
          telefonoWhatsApp: turno.telefonoNotificaciones,
          fecha: this.formatFecha(turno.fecha),
          hora: turno.horaInicio,
          doctor: profesional ? `${profesional.nombre} ${profesional.apellido}` : 'Doctor'
        };

        this.whatsappService.enviarConfirmacionTurno(turnoData).subscribe({
          next: () => console.log('WhatsApp enviado'),
          error: (err) => console.error('Error enviando WhatsApp:', err)
        });
      }

      // Recargar lista
      this.cargarTurnos();
      alert('Turno confirmado exitosamente');
    } catch (error) {
      console.error('Error confirmando turno:', error);
      alert('Error al confirmar el turno');
    } finally {
      this.procesando.set(null);
    }
  }

  async cancelarTurno(turno: Turno): Promise<void> {
    const razon = prompt('Ingrese el motivo de la cancelación:');
    if (!razon) return;

    this.procesando.set(turno.id);

    try {
      // Cambiar estado
      await this.turnoService.cancelarTurno(turno.id, razon);

      // Enviar WhatsApp si tiene teléfono
      if (turno.notificacionesWhatsApp && turno.telefonoNotificaciones) {
        const paciente = this.getPaciente(turno.pacienteId);
        const profesional = this.getProfesional(turno.profesionalId);

        const turnoData: TurnoData = {
          pacienteNombre: paciente?.nombre || 'Paciente',
          telefonoWhatsApp: turno.telefonoNotificaciones,
          fecha: this.formatFecha(turno.fecha),
          hora: turno.horaInicio,
          doctor: profesional ? `${profesional.nombre} ${profesional.apellido}` : 'Doctor'
        };

        this.whatsappService.enviarCancelacionTurno(turnoData, razon).subscribe({
          next: () => console.log('WhatsApp enviado'),
          error: (err) => console.error('Error enviando WhatsApp:', err)
        });
      }

      // Recargar lista
      this.cargarTurnos();
      alert('Turno cancelado exitosamente');
    } catch (error) {
      console.error('Error cancelando turno:', error);
      alert('Error al cancelar el turno');
    } finally {
      this.procesando.set(null);
    }
  }

  setFiltro(filtro: EstadoTurno | 'todos'): void {
    this.filtroEstado.set(filtro);
  }

  getEstadoClass(estado: EstadoTurno): string {
    const base = 'px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (estado) {
      case EstadoTurno.PENDIENTE: return `${base} bg-yellow-100 text-yellow-800`;
      case EstadoTurno.CONFIRMADO: return `${base} bg-emerald-100 text-emerald-800`;
      case EstadoTurno.REPROGRAMADO: return `${base} bg-blue-100 text-blue-800`;
      case EstadoTurno.CANCELADO: return `${base} bg-red-100 text-red-800`;
      case EstadoTurno.COMPLETADO: return `${base} bg-gray-100 text-gray-800`;
      case EstadoTurno.NO_ASISTIO: return `${base} bg-orange-100 text-orange-800`;
      default: return `${base} bg-gray-100 text-gray-800`;
    }
  }
}
