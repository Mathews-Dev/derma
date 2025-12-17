import { Component, inject, signal, output, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { TurnoService } from '../../../core/services/turno.service';
import { Turno } from '../../../core/interfaces/turno.model';

@Component({
  selector: 'app-programar-sesion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './programar-sesion.component.html',
  styleUrl: './programar-sesion.component.css'
})
export class ProgramarSesionComponent {
  private turnoService = inject(TurnoService);

  // Inputs
  profesionalId = input.required<string>();
  pacienteId = input.required<string>();
  tratamientoNombre = input.required<string>();

  // Outputs
  sesionProgramada = output<Turno>();
  cancelar = output<void>();

  // Calendar State
  mesActual = signal<Date>(new Date());
  diasCalendario = signal<Date[]>([]);
  fechaSeleccionada = signal<Date | null>(null);
  horaSeleccionada = signal<string>('');

  // UI State
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  turnoVista = signal<'manana' | 'tarde'>('manana');
  mostrarHorarioPersonalizado = signal<boolean>(false);
  horarioPersonalizado = signal<string>('');

  // Available time slots (08:00 to 19:00)
  horariosManana = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'
  ];

  horariosTarde = [
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  // Computed: current time slots based on selected tab
  horariosActuales = computed(() => {
    return this.turnoVista() === 'manana' ? this.horariosManana : this.horariosTarde;
  });

  constructor() {
    this.generarCalendario();
  }

  // ==================== CALENDAR ====================

  generarCalendario(): void {
    const year = this.mesActual().getFullYear();
    const month = this.mesActual().getMonth();

    const primerDiaMes = new Date(year, month, 1);
    const ultimoDiaMes = new Date(year, month + 1, 0);

    const dias: Date[] = [];

    // Fill previous days (to start on Sunday)
    for (let i = 0; i < primerDiaMes.getDay(); i++) {
      const d = new Date(year, month, 1 - (primerDiaMes.getDay() - i));
      dias.push(d);
    }

    // Days of the month
    for (let i = 1; i <= ultimoDiaMes.getDate(); i++) {
      dias.push(new Date(year, month, i));
    }

    this.diasCalendario.set(dias);
  }

  cambiarMes(delta: number): void {
    const nuevaFecha = new Date(this.mesActual());
    nuevaFecha.setMonth(nuevaFecha.getMonth() + delta);

    // Don't allow past months
    const hoy = new Date();
    if (delta < 0 && nuevaFecha.getMonth() < hoy.getMonth() && nuevaFecha.getFullYear() === hoy.getFullYear()) {
      return;
    }

    this.mesActual.set(nuevaFecha);
    this.generarCalendario();
  }

  seleccionarFecha(fecha: Date): void {
    // Validate not past date
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fecha <= hoy) return;

    this.fechaSeleccionada.set(fecha);
    this.horaSeleccionada.set('');
  }

  esFechaPasada(fecha: Date): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha <= hoy;
  }

  esMismoDia(d1: Date, d2: Date | null): boolean {
    if (!d2) return false;
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  }

  esMesActual(fecha: Date): boolean {
    return fecha.getMonth() === this.mesActual().getMonth();
  }

  usarHorarioPersonalizado(): void {
    const horario = this.horarioPersonalizado();
    console.log('Horario personalizado ingresado:', horario);

    if (horario && horario.trim()) {
      // Ensure format is HH:mm
      let horarioFormateado = horario.trim();

      // If only hours provided (e.g., "21"), add ":00"
      if (horarioFormateado.length <= 2 && !horarioFormateado.includes(':')) {
        horarioFormateado = horarioFormateado.padStart(2, '0') + ':00';
      }

      console.log('Horario formateado:', horarioFormateado);

      // Determine if it's morning or afternoon
      const [hora] = horarioFormateado.split(':').map(Number);
      const esMañana = hora < 13;

      // Add to appropriate array if not already there
      if (esMañana) {
        if (!this.horariosManana.includes(horarioFormateado)) {
          this.horariosManana.push(horarioFormateado);
          this.horariosManana.sort(); // Keep sorted
        }
        this.turnoVista.set('manana'); // Switch to morning tab
      } else {
        if (!this.horariosTarde.includes(horarioFormateado)) {
          this.horariosTarde.push(horarioFormateado);
          this.horariosTarde.sort(); // Keep sorted
        }
        this.turnoVista.set('tarde'); // Switch to afternoon tab
      }

      // Select the custom time
      this.horaSeleccionada.set(horarioFormateado);
      this.mostrarHorarioPersonalizado.set(false);
      this.horarioPersonalizado.set('');
    } else {
      console.log('Horario vacío o inválido');
    }
  }

  // ==================== CONFIRMATION ====================

  async confirmarSesion(): Promise<void> {
    if (!this.fechaSeleccionada() || !this.horaSeleccionada()) {
      this.errorMessage.set('Por favor selecciona una fecha y hora');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      const fecha = this.fechaSeleccionada()!;
      const duracion = 60;
      const horaFin = this.calcularHoraFin(this.horaSeleccionada(), duracion);

      const nuevoTurno: Partial<Turno> = {
        pacienteId: this.pacienteId(),
        profesionalId: this.profesionalId(),
        fecha: Timestamp.fromDate(fecha),
        horaInicio: this.horaSeleccionada(),
        horaFin,
        tipo: 'tratamiento',
        motivo: `Primera sesión: ${this.tratamientoNombre()}`,
        notificacionesWhatsApp: false,
        telefonoNotificaciones: null,
        estadoPago: 'PENDIENTE',
        monto: 0
      };

      const turnoId = await this.turnoService.crearTurno(nuevoTurno);

      // Get complete turn
      const turnos = await this.turnoService.getTurnosPorPaciente(this.pacienteId());
      const turnoCompleto = turnos?.find(t => t.id === turnoId);

      if (turnoCompleto) {
        this.sesionProgramada.emit(turnoCompleto);
      }
    } catch (error) {
      console.error('Error al programar sesión:', error);
      this.errorMessage.set('Hubo un error al programar la sesión. Intenta nuevamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private calcularHoraFin(horaInicio: string, duracion: number): string {
    const [horas, minutos] = horaInicio.split(':').map(Number);
    const minutosTotal = horas * 60 + minutos + duracion;

    const horasFin = Math.floor(minutosTotal / 60);
    const minutosFin = minutosTotal % 60;

    return `${horasFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}`;
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}
