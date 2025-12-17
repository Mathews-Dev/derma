import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
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
import { WhatsappService } from '../../../../core/services/whatsapp.service';

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
export class SacarTurnoComponent implements OnInit, OnDestroy {
  private turnoService = inject(TurnoService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private whatsappService = inject(WhatsappService);

  // Stepper state
  pasoActual = signal<number>(1);
  totalPasos = 5;

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
  isProcessingPayment = signal<boolean>(false);
  turnoCreado = signal<Turno | null>(null);

  // 🆕 Propiedades para polling
  private pollingInterval: any;
  private intentosPolling = 0;
  private maxIntentosPolling = 40; // 40 intentos x 3 seg = 2 minutos
  estadoValidacion = signal<'esperando' | 'validado' | 'timeout'>('esperando');

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
    // Ya no confirmamos aquí, vamos al pago
    this.siguientePaso();
  }

  // ==================== PAGO Y CONFIRMACIÓN ====================

  async simularPago(): Promise<void> {
    this.isProcessingPayment.set(true);

    // Simular delay de 3 segundos
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Confirmar turno
    await this.confirmarTurno();

    this.isProcessingPayment.set(false);
  }

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

      // 🔥 CREAR TURNO (con pago)
      const nuevoTurno: Partial<Turno> = {
        pacienteId: usuario.uid,
        profesionalId: profesional.uid,
        fecha: Timestamp.fromDate(fecha),
        horaInicio: hora,
        horaFin,
        motivo: this.motivo() || null,
        notificacionesWhatsApp: this.notificacionesWhatsApp(),
        telefonoNotificaciones: this.notificacionesWhatsApp()
          ? null // Se actualizará con polling
          : this.telefonoNotificaciones() || null,

        // Datos de Pago
        estadoPago: 'PAGADO',
        monto: profesional.precioConsulta || 0,
        metodoPago: 'TARJETA'
      };

      const turnoId = await this.turnoService.crearTurno(nuevoTurno);

      // Obtener turno creado
      const turnos = await this.turnoService.getTurnosPorPaciente(usuario.uid);
      const turnoCompleto = turnos?.find(t => t.id === turnoId);

      if (turnoCompleto) {
        this.turnoCreado.set(turnoCompleto);
        this.siguientePaso(); // Ir a paso 5 (éxito)

        // 🔥 SI HABILITÓ WHATSAPP: Iniciar polling
        if (this.notificacionesWhatsApp()) {
          this.iniciarPollingValidacion(turnoId);
        }
      }
    } catch (error) {
      console.error('Error al crear turno:', error);
      alert('Hubo un error al crear el turno. Por favor intenta nuevamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // 🆕 POLLING: Consultar cada 3 segundos si llegó el número
  private iniciarPollingValidacion(turnoId: string): void {
    console.log('🔄 Iniciando polling de validación para turno:', turnoId);
    this.estadoValidacion.set('esperando');

    this.pollingInterval = setInterval(() => {
      this.intentosPolling++;

      console.log(`📡 Intento ${this.intentosPolling}/${this.maxIntentosPolling}`);

      this.whatsappService.obtenerValidacion(turnoId).subscribe({
        next: async (response) => {
          if (response.validado && response.data) {
            console.log('✅ Validación recibida:', response.data.telefono);

            // ACTUALIZAR TURNO EN FIREBASE
            await this.turnoService.actualizarTurno(turnoId, {
              telefonoNotificaciones: response.data.telefono
            });

            // Actualizar turno local
            const turnoActual = this.turnoCreado();
            if (turnoActual) {
              this.turnoCreado.set({
                ...turnoActual,
                telefonoNotificaciones: response.data.telefono
              });
            }

            this.estadoValidacion.set('validado');
            this.detenerPolling();

            alert(`✅ ¡Teléfono validado exitosamente!\n${response.data.telefono}`);
          }
        },
        error: (err) => {
          // Si es 404, simplemente sigue esperando
          if (err.status !== 404) {
            console.error('Error en polling:', err);
          }
        }
      });

      // Timeout después de 2 minutos
      if (this.intentosPolling >= this.maxIntentosPolling) {
        console.log('⏱️ Timeout de validación alcanzado');
        this.estadoValidacion.set('timeout');
        this.detenerPolling();
      }
    }, 3000); // Cada 3 segundos
  }

  private detenerPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.intentosPolling = 0;
      console.log('🛑 Polling detenido');
    }
  }

  // IMPORTANTE: Limpiar polling al destruir componente
  ngOnDestroy(): void {
    this.detenerPolling();
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
