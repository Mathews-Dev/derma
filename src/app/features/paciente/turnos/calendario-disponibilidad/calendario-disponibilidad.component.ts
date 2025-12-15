import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TurnoService } from '../../../../core/services/turno.service';
import { Profesional } from '../../../../core/interfaces/profesional.model';
import { SlotHorario } from '../../../../core/interfaces/turno.model';

@Component({
  selector: 'app-calendario-disponibilidad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendario-disponibilidad.component.html',
  styleUrl: './calendario-disponibilidad.component.css'
})
export class CalendarioDisponibilidadComponent implements OnChanges {
  private turnoService = inject(TurnoService);

  @Input() profesional!: Profesional;
  @Output() fechaHoraSeleccionada = new EventEmitter<{ fecha: Date; hora: string }>();

  // Estado del calendario
  fechaActual = signal<Date>(new Date());
  mesActual = signal<Date>(new Date());
  diasCalendario = signal<Date[]>([]);

  // Estado de slots
  slotsDelDia = signal<SlotHorario[]>([]);
  isLoadingSlots = signal<boolean>(false);
  fechaSeleccionada = signal<Date | null>(null);
  horaSeleccionada = signal<string | null>(null);

  constructor() {
    this.generarCalendario();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profesional'] && !changes['profesional'].firstChange) {
      this.fechaSeleccionada.set(null);
      this.horaSeleccionada.set(null);
      this.slotsDelDia.set([]);
    }
  }

  // ==================== CALENDARIO ====================

  generarCalendario(): void {
    const year = this.mesActual().getFullYear();
    const month = this.mesActual().getMonth();

    const primerDiaMes = new Date(year, month, 1);
    const ultimoDiaMes = new Date(year, month + 1, 0);

    const dias: Date[] = [];

    // Rellenar días previos (para empezar en Lunes o Domingo según config)
    // Asumimos semana empieza en Domingo (0)
    for (let i = 0; i < primerDiaMes.getDay(); i++) {
      const d = new Date(year, month, 1 - (primerDiaMes.getDay() - i));
      dias.push(d);
    }

    // Días del mes
    for (let i = 1; i <= ultimoDiaMes.getDate(); i++) {
      dias.push(new Date(year, month, i));
    }

    this.diasCalendario.set(dias);
  }

  cambiarMes(delta: number): void {
    const nuevaFecha = new Date(this.mesActual());
    nuevaFecha.setMonth(nuevaFecha.getMonth() + delta);

    // No permitir ir a meses pasados
    const hoy = new Date();
    if (delta < 0 && nuevaFecha.getMonth() < hoy.getMonth() && nuevaFecha.getFullYear() === hoy.getFullYear()) {
      return;
    }

    this.mesActual.set(nuevaFecha);
    this.generarCalendario();
  }

  async seleccionarFecha(fecha: Date): Promise<void> {
    // Validar que no sea fecha pasada
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fecha < hoy) return;

    // Validar que sea día laboral del profesional (opcional, ya filtrado en UI)

    this.fechaSeleccionada.set(fecha);
    this.horaSeleccionada.set(null);
    this.cargarSlots(fecha);
  }

  esFechaPasada(fecha: Date): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha < hoy;
  }

  esMismoDia(d1: Date, d2: Date | null): boolean {
    if (!d2) return false;
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  }

  esDiaLaboral(fecha: Date): boolean {
    if (!this.profesional?.horariosLaborales) return false;

    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaString = diasSemana[fecha.getDay()] as keyof typeof this.profesional.horariosLaborales;

    const horarios = this.profesional.horariosLaborales[diaString];
    return !!horarios && horarios.length > 0;
  }

  // ==================== SLOTS ====================

  async cargarSlots(fecha: Date): Promise<void> {
    this.isLoadingSlots.set(true);
    try {
      const slots = await this.turnoService.calcularDisponibilidad(this.profesional.uid, fecha);
      this.slotsDelDia.set(slots);
    } catch (error) {
      console.error('Error cargando slots:', error);
      this.slotsDelDia.set([]);
    } finally {
      this.isLoadingSlots.set(false);
    }
  }

  seleccionarHora(hora: string): void {
    const fecha = this.fechaSeleccionada();
    if (fecha) {
      this.horaSeleccionada.set(hora);
      this.fechaHoraSeleccionada.emit({ fecha, hora });
    }
  }
}
