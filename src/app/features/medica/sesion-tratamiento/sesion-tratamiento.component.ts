import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { QRCodeComponent } from 'angularx-qrcode';
import { CapturaFotoComponent } from '../../../shared/components/captura-foto/captura-foto.component';


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
  imports: [CommonModule, FormsModule, CapturaFotoComponent, QRCodeComponent],
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
  totalSteps = signal<number>(5);
  stepsArray = signal<number[]>([1, 2, 3, 4, 5]);

  // Fotografías y Documentos
  fotosAntes = signal<string[]>([]);
  fotosDespues = signal<string[]>([]);
  documentoConsentimiento = signal<string | null>(null);
  mostrarCamaraAntes = signal<boolean>(false);
  mostrarCamaraDespues = signal<boolean>(false);
  mostrarCamaraConsentimiento = signal<boolean>(false);

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

  // Estado de la sesión
  esSesionFinalManual = signal<boolean>(false);

  // Labels dinámicos para fotos
  labelFotoAntes = signal<string>('Foto Antes');
  labelFotoDespues = signal<string>('Foto Después');

  // QR Code
  qrSessionId = signal<string | null>(null);
  qrUrl = signal<string | null>(null);
  qrTipo = signal<'antes' | 'despues' | 'consentimiento' | null>(null);
  mostrarQR = signal<boolean>(false);
  private qrSubscription?: Subscription;

  // Vista ampliada de fotos
  fotoAmpliada = signal<string | null>(null);
  tipoFotoAmpliada = signal<'antes' | 'despues' | 'consentimiento' | null>(null);
  mostrarFotoAmpliada = signal<boolean>(false);

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

          // ✅ Labels dinámicos por sesión
          if (this.numeroSesion() === 1) {
            this.labelFotoAntes.set('Foto Antes');
            this.labelFotoDespues.set('Foto Después');
          } else {
            this.labelFotoAntes.set('Foto Progreso');
            this.labelFotoDespues.set(this.esUltimaSesion() ? 'Foto Final' : 'Foto Después');
          }

          // ✅ Configuración inteligente por defecto
          this.esSesionFinalManual.set(this.esUltimaSesion());
          this.actualizarEstructuraStepper();
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

  // === ESTRUCTURA DINAMICA ===
  actualizarEstructuraStepper() {
    let steps: number[] = [];

    if (this.numeroSesion() === 1) {
      // Orden exacto solicitado: 1- Instrucciones, 2- NOTAS, 3- Proxima sesion, 4- Foto Antes, 5- Consentimiento
      steps = [1, 4, 2, 3, 6];
    } else {
      // S>1: Instrucciones (1) -> Notas (4) -> Proxima (2) -> Foto Progreso (3) -> Foto Despues (5)
      steps = [1, 4, 2, 3, 5];
    }

    this.stepsArray.set(steps);
    this.totalSteps.set(steps.length);

    // Asegurar que el currentStep sea válido
    const stepsValidos = this.stepsArray();
    if (!stepsValidos.includes(this.currentStep())) {
      this.currentStep.set(1);
    }
  }

  setTipoSesion(final: boolean) {
    this.esSesionFinalManual.set(final);
    this.actualizarEstructuraStepper();
  }

  get logicalCurrentStepIndex(): number {
    return this.stepsArray().indexOf(this.currentStep()) + 1;
  }

  nextStep() {
    const currentIndex = this.stepsArray().indexOf(this.currentStep());
    if (currentIndex < this.stepsArray().length - 1) {
      this.currentStep.set(this.stepsArray()[currentIndex + 1]);
    }
  }

  prevStep() {
    const currentIndex = this.stepsArray().indexOf(this.currentStep());
    if (currentIndex > 0) {
      this.currentStep.set(this.stepsArray()[currentIndex - 1]);
    }
  }

  getLabelForStep(step: number): string {
    switch (step) {
      case 1: return 'Instrucciones';
      case 4: return 'Notas';
      case 2: return 'Próxima Sesión';
      case 3: return this.labelFotoAntes();
      case 6: return 'Consentimiento';
      case 5: return this.labelFotoDespues();
      default: return '';
    }
  }

  toggleSesionFinal() {
    this.esSesionFinalManual.update(v => !v);
    this.actualizarEstructuraStepper();
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

  onFotoConsentimientoCapturada(base64: string) {
    this.documentoConsentimiento.set(base64);
    this.mostrarCamaraConsentimiento.set(false);
  }

  eliminarConsentimiento() {
    this.documentoConsentimiento.set(null);
  }

  eliminarFotoDespues(index: number) {
    this.fotosDespues.set([]);
  }

  // === VISTA AMPLIADA DE FOTOS ===
  ampliarFoto(base64: string, tipo: 'antes' | 'despues' | 'consentimiento') {
    this.fotoAmpliada.set(base64);
    this.tipoFotoAmpliada.set(tipo);
    this.mostrarFotoAmpliada.set(true);
  }

  cerrarFotoAmpliada() {
    this.mostrarFotoAmpliada.set(false);
    this.fotoAmpliada.set(null);
    this.tipoFotoAmpliada.set(null);
  }

  eliminarFotoAmpliada() {
    if (!confirm('¿Eliminar esta foto?')) return;

    const tipo = this.tipoFotoAmpliada();
    if (tipo === 'antes') {
      this.fotosAntes.set([]);
    } else if (tipo === 'despues') {
      this.fotosDespues.set([]);
    } else if (tipo === 'consentimiento') {
      this.documentoConsentimiento.set(null);
    }

    this.cerrarFotoAmpliada();
  }

  retomarFotoAmpliada() {
    const tipo = this.tipoFotoAmpliada();
    this.cerrarFotoAmpliada();

    // Abrir QR para tomar nueva foto
    if (tipo) {
      this.generarQRParaFoto(tipo);
    }
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
    // Debe tener notas profesionales
    const tieneNotas = this.notasProfesional().trim() !== '';

    // En S1 el consentimiento es mandatorio
    if (this.numeroSesion() === 1 && !this.documentoConsentimiento()) {
      return false;
    }

    return tieneNotas;
  }

  // === FINALIZAR SESIÓN ===
  async finalizarSesion() {
    if (!this.esValido()) {
      alert('Debes completar los requisitos obligatorios (Consentimiento si aplica y Notas)');
      return;
    }

    if (!this.tratamientoPaciente() || !this.turno() || !this.paciente()) return;

    this.guardando.set(true);

    try {
      const fotosIds: string[] = [];

      // 0. Guardar Consentimiento si existe
      if (this.documentoConsentimiento()) {
        const foto: FotoProgreso = {
          id: this.firestoreService.createId(),
          pacienteId: this.paciente()!.uid,
          tratamientoId: this.tratamientoPaciente()!.id,
          tratamientoNombre: this.tratamientoPaciente()!.nombreTratamiento,
          fecha: new Date(),
          tipo: 'consentimiento' as any,
          sesionNumero: this.numeroSesion(),
          imagenUrl: this.documentoConsentimiento()!,
          notas: `Consentimiento informado - Sesión ${this.numeroSesion()}`,
          visiblePaciente: true
        };
        await this.fotoService.guardarFoto(foto);
      }

      // 1. Guardar foto ANTES / DURANTE
      for (const fotoBase64 of this.fotosAntes()) {
        const tipo: 'antes' | 'durante' = this.numeroSesion() === 1 ? 'antes' : 'durante';
        const foto: FotoProgreso = {
          id: this.firestoreService.createId(),
          pacienteId: this.paciente()!.uid,
          tratamientoId: this.tratamientoPaciente()!.id,
          tratamientoNombre: this.tratamientoPaciente()!.nombreTratamiento,
          fecha: new Date(),
          tipo: tipo,
          sesionNumero: this.numeroSesion(),
          imagenUrl: fotoBase64,
          notas: `Sesión ${this.numeroSesion()} - ${tipo === 'antes' ? 'Antes' : 'Durante/Progreso'}`,
          visiblePaciente: true
        };
        await this.fotoService.guardarFoto(foto);
        fotosIds.push(foto.id);
      }

      // 2. Guardar fotos DESPUÉS (Solo en sesiones > 1)
      if (this.numeroSesion() > 1) {
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
      const nuevoEstado = (sesionesRealizadas >= this.tratamientoPaciente()!.sesionesTotales || this.esSesionFinalManual())
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

      // 6. Programar Siguiente Sesión (si se especificó y no es final)
      if (!this.esUltimaSesion() && !this.esSesionFinalManual() && this.fechaProximaSesion() && this.horaProximaSesion()) {
        const [año, mes, día] = this.fechaProximaSesion().split('-').map(Number);
        const [horaArr, minArr] = this.horaProximaSesion().split(':').map(Number);
        const fechaHora = new Date(año, mes - 1, día, horaArr, minArr);

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
          monto: 0,
          notificacionesWhatsApp: true
        };

        await this.turnoService.crearTurno(nuevoTurno as any);
        alert(`Sesión finalizada y próxima sesión programada.`);
      } else {
        alert('Sesión finalizada exitosamente');
      }

      this.router.navigate(['/medica/agenda']);

    } catch (error) {
      console.error('Error al finalizar sesión:', error);
      alert('Error al finalizar la sesión. Por favor intenta nuevamente.');
    } finally {
      this.guardando.set(false);
    }
  }

  // === PROGRAMACIÓN DE SIGUIENTE SESIÓN ===
  onSesionProgramada(turno: Turno): void {
    this.showSchedulingModal.set(false);
    alert(`Próxima sesión programada para ${new Date(turno.fecha).toLocaleDateString()}`);
    this.router.navigate(['/medica/agenda']);
  }

  onCancelarProgramacion(): void {
    this.showSchedulingModal.set(false);
    // Volver a agenda sin programar
    this.router.navigate(['/medica/agenda']);
  }

  // === QR CODE ===
  generarQRParaFoto(tipo: 'antes' | 'despues' | 'consentimiento') {
    const sessionId = this.firestoreService.createId();
    let baseUrl = window.location.origin;

    // Verificación de conectividad móvil
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      console.warn('⚠️ Estás en LOCALHOST. El QR no funcionará en móviles.');
      console.info('👉 Tip: Usa el Reenvío de Puertos de VS Code o Tunnelmole/Ngrok y accede a la app DESDE ESA URL en tu PC.');
    } else if (!baseUrl.startsWith('https')) {
      console.warn('⚠️ No estás usando HTTPS. Es posible que la cámara no abra en algunos móviles.');
    }

    const url = `${baseUrl}/captura-foto/${sessionId}/${tipo}`;
    console.log('✅ QR URL generada correctamente:', url);

    this.qrSessionId.set(sessionId);
    this.qrUrl.set(url);
    this.qrTipo.set(tipo);
    this.mostrarQR.set(true);

    this.escucharFotoQR(sessionId, tipo);
  }

  escucharFotoQR(sessionId: string, tipo: 'antes' | 'despues' | 'consentimiento') {
    this.qrSubscription = this.firestoreService
      .getCollectionByFilter<any>('fotos_temp', 'sessionId', sessionId)
      .subscribe(fotos => {
        if (fotos.length > 0) {
          const foto = fotos[0];

          if (tipo === 'antes') {
            this.fotosAntes.set([foto.imagenUrl]);
          } else if (tipo === 'despues') {
            this.fotosDespues.set([foto.imagenUrl]);
          } else if (tipo === 'consentimiento') {
            this.documentoConsentimiento.set(foto.imagenUrl);
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

