import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { QRCodeComponent } from 'angularx-qrcode';
import { CapturaFotoComponent } from '../../../shared/components/captura-foto/captura-foto.component';
import { ProgramarSesionComponent } from '../programar-sesion/programar-sesion.component';

import { FirestoreService } from '../../../core/services/firestore.service';
import { FotoProgresoService } from '../../../core/services/foto-progreso.service';
import { TurnoService } from '../../../core/services/turno.service';
import { TratamientoPacienteService } from '../../../core/services/tratamiento-paciente.service';
import { SesionTratamientoService } from '../../../core/services/sesion-tratamiento.service';

import { Turno } from '../../../core/interfaces/turno.model';
import { TratamientoPaciente } from '../../../core/interfaces/tratamiento.model';
import { Paciente } from '../../../core/interfaces/paciente.model';
import { FotoProgreso } from '../../../core/interfaces/historial-medico.model';
import { SesionTratamiento, ProductoUsado } from '../../../core/interfaces/sesion-tratamiento.model';

@Component({
  selector: 'app-sesion-tratamiento',
  standalone: true,
  imports: [CommonModule, FormsModule, CapturaFotoComponent, ProgramarSesionComponent, QRCodeComponent],
  templateUrl: './sesion-tratamiento.component.html',
  styleUrl: './sesion-tratamiento.component.css'
})
export class SesionTratamientoComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestoreService = inject(FirestoreService);
  private fotoService = inject(FotoProgresoService);
  private turnoService = inject(TurnoService);
  private tratamientoPacienteService = inject(TratamientoPacienteService);
  private sesionService = inject(SesionTratamientoService);

  // Datos cargados
  turnoId = signal<string | null>(null);
  turno = signal<Turno | null>(null);
  tratamientoPaciente = signal<TratamientoPaciente | null>(null);
  paciente = signal<Paciente | null>(null);
  tratamientoBase = signal<any | null>(null); // Tratamiento original

  // Sesión actual
  numeroSesion = signal<number>(0);
  esPrimeraSesion = signal<boolean>(false);
  esUltimaSesion = signal<boolean>(false);

  // Stepper
  currentStep = signal<number>(1);
  totalSteps = 5;

  // Fotografías
  fotosAntes = signal<string[]>([]);
  fotosDespues = signal<string[]>([]);
  mostrarCamaraAntes = signal<boolean>(false);
  mostrarCamaraDespues = signal<boolean>(false);

  // Formulario
  procedimientoRealizado = signal<string>('');
  productosUsados = signal<ProductoUsado[]>([]);
  tempProductoNombre = signal<string>('');
  tempProductoMarca = signal<string>('');
  notasProfesional = signal<string>('');
  reaccionPaciente = signal<string>('');
  instruccionesPost = signal<string[]>([]);
  tempInstruccion = signal<string>('');

  // Fecha próxima sesión
  fechaProximaSesion = signal<string>('');
  horaProximaSesion = signal<string>('');

  // QR Code
  qrSessionId = signal<string | null>(null);
  qrUrl = signal<string | null>(null);
  qrTipo = signal<'antes' | 'despues' | null>(null);
  mostrarQR = signal<boolean>(false);
  private qrSubscription?: Subscription;

  // Modal de programación (ya no se usa, pero lo dejo por compatibilidad)
  showSchedulingModal = signal<boolean>(false);
  schedulingData = signal<{ pacienteId: string; profesionalId: string; tratamientoNombre: string } | null>(null);

  // Estado
  loading = signal<boolean>(true);
  guardando = signal<boolean>(false);

  async ngOnInit() {
    this.route.paramMap.subscribe(async params => {
      const id = params.get('turnoId');
      if (id) {
        this.turnoId.set(id);
        await this.loadData(id);
      }
    });
  }

  async loadData(turnoId: string) {
    try {
      this.loading.set(true);

      // 1. Cargar Turno
      const turnoData = await this.firestoreService.getDocumentById<Turno>('turnos', turnoId);
      if (!turnoData) {
        console.error('Turno no encontrado');
        return;
      }
      this.turno.set(turnoData);

      // 2. Cargar TratamientoPaciente
      if (turnoData.tratamientoId) {
        const tratamiento = await this.firestoreService.getDocumentById<TratamientoPaciente>(
          'tratamientos_pacientes',
          turnoData.tratamientoId
        );
        if (tratamiento) {
          this.tratamientoPaciente.set(tratamiento);

          // Calcular número de sesión
          const numSesion = (tratamiento.sesionesRealizadas || 0) + 1;
          this.numeroSesion.set(numSesion);
          this.esPrimeraSesion.set(numSesion === 1);
          this.esUltimaSesion.set(numSesion >= tratamiento.sesionesTotales);

          // ✅ NUEVO: Cargar Tratamiento base para instrucciones
          const tratamientoBase = await this.firestoreService.getDocumentById<any>(
            'tratamientos',
            tratamiento.tratamientoId
          );

          if (tratamientoBase) {
            this.tratamientoBase.set(tratamientoBase);

            // ✅ Pre-cargar instrucciones post-sesión
            if (tratamientoBase.instruccionesPost && tratamientoBase.instruccionesPost.length > 0) {
              this.instruccionesPost.set([...tratamientoBase.instruccionesPost]);
            }
          }
        }
      }

      // 3. Cargar Paciente
      const pacienteData = await this.firestoreService.getDocumentById<Paciente>('usuarios', turnoData.pacienteId);
      this.paciente.set(pacienteData || null);

    } catch (error) {
      console.error('Error cargando datos de sesión:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // === STEPPER ===
  nextStep() {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToStep(step: number) {
    this.currentStep.set(step);
  }

  // === FOTOGRAFÍAS (Limitado a una sola foto) ===
  onFotoAntesCapturada(base64: string) {
    this.fotosAntes.set([base64]);
    this.mostrarCamaraAntes.set(false);
  }

  onFotoDespuesCapturada(base64: string) {
    this.fotosDespues.set([base64]);
    this.mostrarCamaraDespues.set(false);
  }

  eliminarFotoAntes(index: number) {
    this.fotosAntes.set([]);
  }

  eliminarFotoDespues(index: number) {
    this.fotosDespues.set([]);
  }

  // === PRODUCTOS ===
  agregarProducto() {
    if (!this.tempProductoNombre().trim()) return;

    const producto: ProductoUsado = {
      nombre: this.tempProductoNombre(),
      marca: this.tempProductoMarca() || undefined
    };

    this.productosUsados.update(productos => [...productos, producto]);
    this.tempProductoNombre.set('');
    this.tempProductoMarca.set('');
  }

  eliminarProducto(index: number) {
    this.productosUsados.update(productos => productos.filter((_, i) => i !== index));
  }

  // === INSTRUCCIONES ===
  agregarInstruccion() {
    if (!this.tempInstruccion().trim()) return;
    this.instruccionesPost.update(instrucciones => [...instrucciones, this.tempInstruccion()]);
    this.tempInstruccion.set('');
  }

  eliminarInstruccion(index: number) {
    this.instruccionesPost.update(instrucciones => instrucciones.filter((_, i) => i !== index));
  }

  // === VALIDACIÓN ===
  esValido(): boolean {
    // Debe tener al menos una foto (antes o después)
    const tieneFotos = this.fotosAntes().length > 0 || this.fotosDespues().length > 0;
    // Debe tener notas profesionales
    const tieneNotas = this.notasProfesional().trim() !== '';

    return tieneFotos && tieneNotas;
  }

  // === FINALIZAR SESIÓN ===
  async finalizarSesion() {
    if (!this.esValido()) {
      alert('Debes agregar al menos una foto y escribir notas profesionales');
      return;
    }

    if (!this.tratamientoPaciente() || !this.turno() || !this.paciente()) return;

    this.guardando.set(true);

    try {
      const fotosIds: string[] = [];

      // 1. Guardar fotos ANTES
      for (const fotoBase64 of this.fotosAntes()) {
        const foto: FotoProgreso = {
          id: this.firestoreService.createId(),
          pacienteId: this.paciente()!.uid,
          tratamientoId: this.tratamientoPaciente()!.id,
          tratamientoNombre: this.tratamientoPaciente()!.nombreTratamiento,
          fecha: new Date(),
          tipo: 'antes',
          sesionNumero: this.numeroSesion(),
          imagenUrl: fotoBase64,
          notas: `Sesión ${this.numeroSesion()} - Antes del tratamiento`,
          visiblePaciente: true
        };
        await this.fotoService.guardarFoto(foto);
        fotosIds.push(foto.id);
      }

      // 2. Guardar fotos DESPUÉS
      for (const fotoBase64 of this.fotosDespues()) {
        const foto: FotoProgreso = {
          id: this.firestoreService.createId(),
          pacienteId: this.paciente()!.uid,
          tratamientoId: this.tratamientoPaciente()!.id,
          tratamientoNombre: this.tratamientoPaciente()!.nombreTratamiento,
          fecha: new Date(),
          tipo: 'despues',
          sesionNumero: this.numeroSesion(),
          imagenUrl: fotoBase64,
          notas: `Sesión ${this.numeroSesion()} - Después del tratamiento`,
          visiblePaciente: true
        };
        await this.fotoService.guardarFoto(foto);
        fotosIds.push(foto.id);
      }

      // 3. Crear registro de SesionTratamiento
      const sesion: Partial<SesionTratamiento> = {
        tratamientoPacienteId: this.tratamientoPaciente()!.id,
        turnoId: this.turnoId()!,
        pacienteId: this.paciente()!.uid,
        profesionalId: this.turno()!.profesionalId,
        numeroSesion: this.numeroSesion(),
        fecha: new Date(),
        procedimientoRealizado: this.procedimientoRealizado(),
        productosUsados: this.productosUsados(),
        notasProfesional: this.notasProfesional(),
        reaccionPaciente: this.reaccionPaciente() || undefined,
        fotosIds: fotosIds,
        instruccionesPostSesion: this.instruccionesPost(),
        completada: true
      };

      await this.sesionService.crearSesion(sesion);

      // 4. Actualizar TratamientoPaciente
      const sesionesRealizadas = this.tratamientoPaciente()!.sesionesRealizadas + 1;
      const progreso = Math.round((sesionesRealizadas / this.tratamientoPaciente()!.sesionesTotales) * 100);
      const nuevoEstado = sesionesRealizadas >= this.tratamientoPaciente()!.sesionesTotales
        ? 'finalizado'
        : 'en_curso';

      await this.tratamientoPacienteService.actualizarTratamiento(this.tratamientoPaciente()!.id, {
        sesionesRealizadas: sesionesRealizadas,
        progreso: progreso,
        estado: nuevoEstado as any
      });

      // 5. Marcar Turno ACTUAL como completado
      await this.turnoService.actualizarTurno(this.turnoId()!, {
        estado: 'completado' as any,
        notasProfesional: this.notasProfesional()
      });

      // 6. Programar Siguiente Sesión (si se especificó en Step 2)
      if (!this.esUltimaSesion() && this.fechaProximaSesion() && this.horaProximaSesion()) {
        const [año, mes, día] = this.fechaProximaSesion().split('-').map(Number);
        const [horaArr, minArr] = this.horaProximaSesion().split(':').map(Number);
        const fechaHora = new Date(año, mes - 1, día, horaArr, minArr);

        // Calcular hora fin (45 min después)
        const fechaFin = new Date(fechaHora.getTime() + 45 * 60000);
        const horaFinStr = `${fechaFin.getHours().toString().padStart(2, '0')}:${fechaFin.getMinutes().toString().padStart(2, '0')}`;

        const nuevoTurno: Partial<Turno> = {
          pacienteId: this.paciente()!.uid,
          profesionalId: this.turno()!.profesionalId,
          fecha: fechaHora,
          horaInicio: this.horaProximaSesion(),
          horaFin: horaFinStr,
          estado: 'pendiente' as any,
          tipo: 'tratamiento',
          tratamientoId: this.tratamientoPaciente()!.id,
          motivo: `Sesión ${this.numeroSesion() + 1} - ${this.tratamientoPaciente()!.nombreTratamiento}`,
          fechaCreacion: new Date(),
          estadoPago: 'PENDIENTE',
          monto: 0, // El monto se define en recepción
          notificacionesWhatsApp: true
        };

        await this.turnoService.crearTurno(nuevoTurno as any);
        alert(`✅ Sesión finalizada y próxima sesión programada para el ${fechaHora.toLocaleDateString()} a las ${this.horaProximaSesion()}`);
      } else {
        alert('✅ Sesión finalizada exitosamente');
      }

      this.router.navigate(['/medica/agenda']);

    } catch (error) {
      console.error('Error al finalizar sesión:', error);
      alert('❌ Error al finalizar la sesión. Por favor intenta nuevamente.');
    } finally {
      this.guardando.set(false);
    }
  }

  // === PROGRAMACIÓN DE SIGUIENTE SESIÓN ===
  onSesionProgramada(turno: Turno): void {
    this.showSchedulingModal.set(false);
    alert(`✅ Próxima sesión programada para ${new Date(turno.fecha).toLocaleDateString()}`);
    this.router.navigate(['/medica/agenda']);
  }

  onCancelarProgramacion(): void {
    this.showSchedulingModal.set(false);
    // Volver a agenda sin programar
    this.router.navigate(['/medica/agenda']);
  }

  // === QR CODE ===
  generarQRParaFoto(tipo: 'antes' | 'despues') {
    const sessionId = this.firestoreService.createId();
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/captura-foto/${sessionId}/${tipo}`;

    this.qrSessionId.set(sessionId);
    this.qrUrl.set(url);
    this.qrTipo.set(tipo);
    this.mostrarQR.set(true);

    this.escucharFotoQR(sessionId, tipo);
  }

  escucharFotoQR(sessionId: string, tipo: 'antes' | 'despues') {
    this.qrSubscription = this.firestoreService
      .getCollectionByFilter<any>('fotos_temp', 'sessionId', sessionId)
      .subscribe(fotos => {
        if (fotos.length > 0) {
          const foto = fotos[0];

          if (tipo === 'antes') {
            this.fotosAntes.set([foto.imagenUrl]);
          } else {
            this.fotosDespues.set([foto.imagenUrl]);
          }

          // Limpiar foto temporal
          this.firestoreService.deleteDocument('fotos_temp', foto.id);
          this.cerrarQR();
        }
      });
  }

  cerrarQR() {
    this.mostrarQR.set(false);
    this.qrSessionId.set(null);
    this.qrUrl.set(null);
    if (this.qrSubscription) {
      this.qrSubscription.unsubscribe();
    }
  }

  // === CANCELAR SESIÓN ===
  cancelar() {
    if (confirm('¿Estás seguro de cancelar esta sesión? Se perderán todos los datos ingresados.')) {
      this.router.navigate(['/medica/agenda']);
    }
  }

  ngOnDestroy() {
    if (this.qrSubscription) {
      this.qrSubscription.unsubscribe();
    }
  }
}

