import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
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

  // Lógica del dropdown de países (Copiado de register-paciente)
  isDropdownOpen = signal(false);

  countries = [
    { name: 'Argentina', code: 'AR', dialCode: '+54', flagUrl: 'https://flagcdn.com/w40/ar.png' },
    { name: 'Brasil', code: 'BR', dialCode: '+55', flagUrl: 'https://flagcdn.com/w40/br.png' },
    { name: 'Chile', code: 'CL', dialCode: '+56', flagUrl: 'https://flagcdn.com/w40/cl.png' },
    { name: 'Uruguay', code: 'UY', dialCode: '+598', flagUrl: 'https://flagcdn.com/w40/uy.png' },
    { name: 'Paraguay', code: 'PY', dialCode: '+595', flagUrl: 'https://flagcdn.com/w40/py.png' },
    { name: 'Bolivia', code: 'BO', dialCode: '+591', flagUrl: 'https://flagcdn.com/w40/bo.png' },
    { name: 'Perú', code: 'PE', dialCode: '+51', flagUrl: 'https://flagcdn.com/w40/pe.png' },
    { name: 'Ecuador', code: 'EC', dialCode: '+593', flagUrl: 'https://flagcdn.com/w40/ec.png' },
    { name: 'Colombia', code: 'CO', dialCode: '+57', flagUrl: 'https://flagcdn.com/w40/co.png' },
    { name: 'Venezuela', code: 'VE', dialCode: '+58', flagUrl: 'https://flagcdn.com/w40/ve.png' },
    { name: 'México', code: 'MX', dialCode: '+52', flagUrl: 'https://flagcdn.com/w40/mx.png' },
    { name: 'España', code: 'ES', dialCode: '+34', flagUrl: 'https://flagcdn.com/w40/es.png' },
    { name: 'Estados Unidos', code: 'US', dialCode: '+1', flagUrl: 'https://flagcdn.com/w40/us.png' },
  ];

  selectedCountry = signal(this.countries[0]);

  toggleDropdown() {
    this.isDropdownOpen.update(v => !v);
  }

  selectCountry(country: any) {
    this.selectedCountry.set(country);
    this.isDropdownOpen.set(false);
  }

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
