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
  mostrarInputTelefono: boolean = false;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      motivo: [''],
      notificacionesWhatsApp: [false],
      telefonoNotificaciones: ['', [Validators.pattern(/^\+?[0-9]{10,13}$/)]] // Validación básica
    });

    // Escuchar cambios en el toggle de WhatsApp
    this.form.get('notificacionesWhatsApp')?.valueChanges.subscribe(checked => {
      this.mostrarInputTelefono = checked;
      const telefonoControl = this.form.get('telefonoNotificaciones');

      if (checked) {
        telefonoControl?.setValidators([Validators.required, Validators.pattern(/^\+?[0-9]{10,13}$/)]);
        // Si no hay valor, establecer default
        if (!telefonoControl?.value && this.telefonoDefault) {
          telefonoControl?.setValue(this.telefonoDefault);
        }
      } else {
        telefonoControl?.clearValidators();
      }
      telefonoControl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      const { motivo, notificacionesWhatsApp, telefonoNotificaciones } = this.form.value;

      this.confirmar.emit({
        motivo: motivo?.trim(),
        notificacionesWhatsApp,
        telefonoNotificaciones: notificacionesWhatsApp ? telefonoNotificaciones : undefined
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
