import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CapturaFotoComponent } from '../../../shared/components/captura-foto/captura-foto.component';
import { Consentimiento } from '../../../core/interfaces/paciente.model';
import { FirestoreService } from '../../../core/services/firestore.service';

@Component({
  selector: 'app-consentimiento-form',
  standalone: true,
  imports: [CommonModule, CapturaFotoComponent],
  templateUrl: './consentimiento-form.component.html',
  styleUrl: './consentimiento-form.component.css'
})
export class ConsentimientoFormComponent {
  @Input() tratamientoNombre: string = '';
  @Input() pacienteId: string = '';
  @Output() consentimientoGuardado = new EventEmitter<Consentimiento>();

  fotoConsentimiento = signal<string>('');
  fechaActual = new Date();

  private firestoreService = inject(FirestoreService);

  onFotoCapturada(base64: string) {
    this.fotoConsentimiento.set(base64);
  }

  confirmarConsentimiento() {
    if (!this.fotoConsentimiento()) return;

    const consentimiento: Consentimiento = {
      id: this.firestoreService.createId(),
      titulo: `Consentimiento - ${this.tratamientoNombre}`,
      fechaFirma: new Date(),
      archivoUrl: this.fotoConsentimiento(),
      tipoTratamiento: this.tratamientoNombre,
      pacienteId: this.pacienteId
    };

    this.consentimientoGuardado.emit(consentimiento);
  }
}
