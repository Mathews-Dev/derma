import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Profesional } from '../../../../core/interfaces/profesional.model';

@Component({
  selector: 'app-confirmacion-turno',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './confirmacion-turno.component.html',
  styleUrl: './confirmacion-turno.component.css'
})
export class ConfirmacionTurnoComponent implements OnInit {
  @Input() profesional!: Profesional;
  @Input() fecha!: Date;
  @Input() hora!: string;
  @Input() telefonoDefault: string = '';
  @Input() isSubmitting: boolean = false;

  @Output() confirmar = new EventEmitter<{
    motivo: string;
    notificacionesWhatsApp: boolean;
    telefonoNotificaciones?: string;
  }>();

  form!: FormGroup;
  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      motivo: [''],
      notificacionesWhatsApp: [true], // Default true
      telefonoNotificaciones: [this.telefonoDefault || '', [Validators.required, Validators.pattern(/^\+?[0-9]{10,13}$/)]]
    });

    // Si viene un teléfono por defecto, setearlo
    if (this.telefonoDefault) {
      this.form.patchValue({ telefonoNotificaciones: this.telefonoDefault });
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      const { motivo, notificacionesWhatsApp, telefonoNotificaciones } = this.form.value;

      this.confirmar.emit({
        motivo: motivo?.trim(),
        notificacionesWhatsApp,
        telefonoNotificaciones: telefonoNotificaciones
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  // Helper para validaciones en template
  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
