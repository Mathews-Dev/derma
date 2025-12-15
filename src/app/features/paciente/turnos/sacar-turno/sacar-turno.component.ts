import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Timestamp } from 'firebase/firestore';
import { environment } from '../../../../../environments/environment';
import { TurnoService } from '../../../../core/services/turno.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Profesional } from '../../../../core/interfaces/profesional.model';
import { Turno } from '../../../../core/interfaces/turno.model';
import { ProfesionalSelectorComponent } from '../profesional-selector/profesional-selector.component';
import { CalendarioDisponibilidadComponent } from '../calendario-disponibilidad/calendario-disponibilidad.component';
import { ConfirmacionTurnoComponent } from '../confirmacion-turno/confirmacion-turno.component';

@Component({
  selector: 'app-sacar-turno',
  standalone: true,
  imports: [
    CommonModule,
    ProfesionalSelectorComponent,
    CalendarioDisponibilidadComponent,
    ConfirmacionTurnoComponent
  ],
  templateUrl: './sacar-turno.component.html',
  styleUrl: './sacar-turno.component.css'
})
export class SacarTurnoComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Stepper state
  pasoActual = signal<number>(1);
  totalPasos = 4;

  // Datos del turno en construcción
  profesionalSeleccionado = signal<Profesional | null>(null);
  fechaSeleccionada = signal<Date | null>(null);
  horaSeleccionada = signal<string | null>(null);

  // Datos adicionales
  motivo = signal<string>('');
  notificacionesWhatsApp = signal<boolean>(false);
  telefonoNotificaciones = signal<string>('');

  // Estados
  isSubmitting = signal<boolean>(false);
  turnoCreado = signal<Turno | null>(null);

  ngOnInit(): void {
    // Pre-cargar teléfono del usuario si está disponible
    const usuario = this.authService.currentUser();
    if (usuario?.telefono) {
      this.telefonoNotificaciones.set(usuario.telefono);
    }
  }

  // ==================== NAVEGACIÓN STEPPER ====================

  irAPaso(paso: number): void {
    if (paso >= 1 && paso <= this.totalPasos) {
      this.pasoActual.set(paso);
    }
  }

  siguientePaso(): void {
    if (this.pasoActual() < this.totalPasos) {
      this.pasoActual.set(this.pasoActual() + 1);
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual() > 1) {
      this.pasoActual.set(this.pasoActual() - 1);
    }
  }

  // ==================== HANDLERS DE SELECCIÓN ====================

  onProfesionalSeleccionado(profesional: Profesional): void {
    this.profesionalSeleccionado.set(profesional);
    this.siguientePaso();
  }

  onFechaHoraSeleccionada(data: { fecha: Date; hora: string }): void {
    this.fechaSeleccionada.set(data.fecha);
    this.horaSeleccionada.set(data.hora);
    this.siguientePaso();
  }

  onDatosConfirmacion(data: {
    motivo: string;
    notificacionesWhatsApp: boolean;
    telefonoNotificaciones?: string;
  }): void {
    this.motivo.set(data.motivo);
    this.notificacionesWhatsApp.set(data.notificacionesWhatsApp);
    if (data.telefonoNotificaciones) {
      this.telefonoNotificaciones.set(data.telefonoNotificaciones);
    }
    this.confirmarTurno();
  }

  // ==================== CONFIRMACIÓN ====================

  async confirmarTurno(): Promise<void> {
    const usuario = this.authService.currentUser();
    const profesional = this.profesionalSeleccionado();
    const fecha = this.fechaSeleccionada();
    const hora = this.horaSeleccionada();

    if (!usuario || !profesional || !fecha || !hora) {
      alert('Faltan datos para crear el turno');
      return;
    }

    this.isSubmitting.set(true);

    try {
      // Calcular hora de fin
      const duracion = profesional.duracionConsulta || 30;
      const horaFin = this.calcularHoraFin(hora, duracion);

      // Crear turno
      const nuevoTurno: Partial<Turno> = {
        pacienteId: usuario.uid,
        profesionalId: profesional.uid,
        fecha: Timestamp.fromDate(fecha),
        horaInicio: hora,
        horaFin,
        motivo: this.motivo() || null,
        notificacionesWhatsApp: this.notificacionesWhatsApp(),
        telefonoNotificaciones: this.notificacionesWhatsApp()
          ? this.telefonoNotificaciones()
          : null
      };

      const turnoId = await this.turnoService.crearTurno(nuevoTurno);

      // Obtener turno creado para mostrar en paso 4
      const turnos = await firstValueFrom(this.turnoService.getTurnosPorPaciente(usuario.uid));
      const turnoCompleto = turnos?.find(t => t.id === turnoId);

      if (turnoCompleto) {
        this.turnoCreado.set(turnoCompleto);
      }

      this.siguientePaso(); // Ir a paso 4 (éxito)
    } catch (error) {
      console.error('Error al crear turno:', error);
      alert('Hubo un error al crear el turno. Por favor intenta nuevamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ==================== HELPERS ====================

  private calcularHoraFin(horaInicio: string, duracion: number): string {
    const [horas, minutos] = horaInicio.split(':').map(Number);
    const minutosTotal = horas * 60 + minutos + duracion;

    const horasFin = Math.floor(minutosTotal / 60);
    const minutosFin = minutosTotal % 60;

    return `${horasFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}`;
  }

  volverAMisTurnos(): void {
    this.router.navigate(['/paciente/mis-turnos']);
  }

  volverADashboard(): void {
    this.router.navigate(['/paciente/dashboard']);
  }

  getWhatsappLink(turno: Turno): string {
    const phoneNumber = environment.whatsappNumber;
    const message = `Hola, quiero validar mi turno. CODIGO: ${turno.id}`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  }

  getQrUrl(turno: Turno): string {
    const link = this.getWhatsappLink(turno);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
  }
}
