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
  filtroFecha = signal<'hoy' | 'ayer' | 'semana' | 'todos'>('hoy');
  terminoBusqueda = signal('');
  EstadoTurno = EstadoTurno;

  // Cache (Signals para reactividad)
  profesionalesCache = signal<Map<string, Profesional>>(new Map());
  pacientesCache = signal<Map<string, Paciente>>(new Map());

  // Acciones en proceso
  procesando = signal<string | null>(null);

  // Paginación
  paginaActual = signal(1);
  itemsPorPagina = signal(10);

  // Filtros computados
  // Filtros computados
  turnosFiltrados = computed(() => {
    let filtrados = this.turnos();
    const estado = this.filtroEstado();
    const fecha = this.filtroFecha();
    const termino = this.normalizarTexto(this.terminoBusqueda());

    // 1. Filtro por Estado
    if (estado !== 'todos') {
      filtrados = filtrados.filter(t => t.estado === estado);
    }

    // 2. Filtro por Fecha
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fecha === 'hoy') {
      filtrados = filtrados.filter(t => {
        const fechaTurno = (t.fecha as any).toDate ? (t.fecha as any).toDate() : new Date(t.fecha);
        fechaTurno.setHours(0, 0, 0, 0);
        return fechaTurno.getTime() === hoy.getTime();
      });
    } else if (fecha === 'ayer') {
      const ayer = new Date(hoy);
      ayer.setDate(ayer.getDate() - 1);
      filtrados = filtrados.filter(t => {
        const fechaTurno = (t.fecha as any).toDate ? (t.fecha as any).toDate() : new Date(t.fecha);
        fechaTurno.setHours(0, 0, 0, 0);
        return fechaTurno.getTime() === ayer.getTime();
      });
    } else if (fecha === 'semana') {
      const haceUnaSemana = new Date(hoy);
      haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);
      filtrados = filtrados.filter(t => {
        const fechaTurno = (t.fecha as any).toDate ? (t.fecha as any).toDate() : new Date(t.fecha);
        return fechaTurno >= haceUnaSemana;
      });
    }

    // 3. Busqueda (Paciente o DNI)
    if (termino) {
      filtrados = filtrados.filter(t => {
        const paciente = this.getPaciente(t.pacienteId);
        const profesional = this.getProfesional(t.profesionalId);

        const nombrePaciente = paciente ? `${paciente.nombre} ${paciente.apellido}` : '';
        const dniPaciente = paciente?.dni || '';
        const nombreProfesional = profesional ? `${profesional.nombre} ${profesional.apellido}` : '';

        return this.normalizarTexto(nombrePaciente).includes(termino) ||
          this.normalizarTexto(dniPaciente).includes(termino) ||
          this.normalizarTexto(nombreProfesional).includes(termino);
      });
    }

    return filtrados;
  });

  // Paginación computada
  totalPaginas = computed(() => {
    const total = this.turnosFiltrados().length;
    return Math.max(1, Math.ceil(total / this.itemsPorPagina()));
  });

  paginasDisponibles = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1)
  );

  turnosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
    const fin = inicio + this.itemsPorPagina();
    return this.turnosFiltrados().slice(inicio, fin);
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
    const profesionalIds = [...new Set(turnos.map(t => t.profesionalId))].filter(Boolean);
    const pacienteIds = [...new Set(turnos.map(t => t.pacienteId))].filter(Boolean);

    console.log('Cargando datos relacionados...', { profesionalIds, pacienteIds });

    // Cargar profesionales
    const promesasProfesionales = profesionalIds
      .filter(id => !this.profesionalesCache().has(id))
      .map(async id => {
        try {
          const prof = await this.firestoreService.getDocument<Profesional>('usuarios', id);
          console.log(`Profesional cargado ${id}:`, prof);
          return { id, data: prof };
        } catch (e) {
          console.error(`Error cargando profesional ${id}:`, e);
          return null;
        }
      });

    // Cargar pacientes
    const promesasPacientes = pacienteIds
      .filter(id => !this.pacientesCache().has(id))
      .map(async id => {
        try {
          const pac = await this.firestoreService.getDocument<Paciente>('usuarios', id);
          console.log(`Paciente cargado ${id}:`, pac);
          return { id, data: pac };
        } catch (e) {
          console.error(`Error cargando paciente ${id}:`, e);
          return null;
        }
      });

    // Ejecutar todas las promesas
    const nuevosProfesionales = await Promise.all(promesasProfesionales);
    const nuevosPacientes = await Promise.all(promesasPacientes);

    console.log('Resultados carga:', { nuevosProfesionales, nuevosPacientes });

    // Actualizar cache Profesionales
    this.profesionalesCache.update(map => {
      const nuevoMap = new Map(map);
      nuevosProfesionales.forEach(p => {
        if (p && p.data) nuevoMap.set(p.id, p.data);
      });
      return nuevoMap;
    });

    // Actualizar cache Pacientes
    this.pacientesCache.update(map => {
      const nuevoMap = new Map(map);
      nuevosPacientes.forEach(p => {
        if (p && p.data) nuevoMap.set(p.id, p.data);
      });
      return nuevoMap;
    });
  }

  // Getters para template
  getProfesional(id: string): Profesional | undefined {
    return this.profesionalesCache().get(id);
  }

  getPaciente(id: string): Paciente | undefined {
    return this.pacientesCache().get(id);
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
    this.paginaActual.set(1);
  }

  setFiltroFecha(filtro: 'hoy' | 'ayer' | 'semana' | 'todos'): void {
    this.filtroFecha.set(filtro);
    this.paginaActual.set(1);
  }

  onBusquedaChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.terminoBusqueda.set(input.value);
    this.paginaActual.set(1);
  }

  private normalizarTexto(texto?: string): string {
    if (!texto) return '';
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  irAPagina(numero: number): void {
    if (numero >= 1 && numero <= this.totalPaginas()) {
      this.paginaActual.set(numero);
    }
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
