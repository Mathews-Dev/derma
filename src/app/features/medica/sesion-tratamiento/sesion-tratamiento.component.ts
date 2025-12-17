import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CapturaFotoComponent } from '../../../shared/components/captura-foto/captura-foto.component';
import { FotoProgreso } from '../../../core/interfaces/historial-medico.model';

import { FirestoreService } from '../../../core/services/firestore.service';
import { FotoProgresoService } from '../../../core/services/foto-progreso.service';

@Component({
  selector: 'app-sesion-tratamiento',
  standalone: true,
  imports: [CommonModule, FormsModule, CapturaFotoComponent],
  templateUrl: './sesion-tratamiento.component.html',
  styleUrl: './sesion-tratamiento.component.css'
})
export class SesionTratamientoComponent {
  @Input() tratamientoNombre: string = '';
  @Input() sesionActual: number = 1;
  @Input() totalSesiones: number = 1;
  @Input() pacienteId: string = '';
  @Input() tratamientoId: string = '';

  @Output() sesionFinalizada = new EventEmitter<any>();
  @Output() cancelarSesion = new EventEmitter<void>();

  fotoSesion = signal<string>('');
  mostrarCamara = signal<boolean>(false);
  notasSesion = signal<string>('');
  fechaActual = new Date();

  private firestoreService = inject(FirestoreService);
  private fotoService = inject(FotoProgresoService);

  onFotoCapturada(base64: string) {
    this.fotoSesion.set(base64);
    this.mostrarCamara.set(false);
  }

  esValido(): boolean {
    return this.fotoSesion() !== '' && this.notasSesion().trim() !== '';
  }

  async finalizarSesion() {
    if (!this.esValido()) return;

    try {
      // 1. Guardar Foto
      const foto: FotoProgreso = {
        id: this.firestoreService.createId(),
        pacienteId: this.pacienteId,
        tratamientoId: this.tratamientoId,
        tratamientoNombre: this.tratamientoNombre,
        fecha: new Date(),
        tipo: 'durante',
        sesionNumero: this.sesionActual,
        imagenUrl: this.fotoSesion(),
        notas: this.notasSesion(),
        visiblePaciente: true
      };

      await this.fotoService.guardarFoto(foto);

      // 2. Emitir evento de finalización
      this.sesionFinalizada.emit({
        fotoId: foto.id,
        notas: this.notasSesion(),
        fecha: new Date()
      });

    } catch (error) {
      console.error('Error al finalizar sesión:', error);
      // Aquí se podría mostrar un toast de error
    }
  }
}
