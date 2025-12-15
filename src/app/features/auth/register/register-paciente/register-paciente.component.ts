import { CommonModule } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

interface Country {
  code: string;
  name: string;
  flagUrl: string;
  dialCode: string;
}

@Component({
  selector: 'app-register-paciente',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register-paciente.component.html',
  styleUrl: './register-paciente.component.css'
})
export class RegisterPacienteComponent {
  private formBuilder: FormBuilder = inject(FormBuilder);
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);

  isSubmitting: boolean = false;
  registerForm: FormGroup;

  constructor() {
    this.registerForm = this.formBuilder.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      apellido: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      email: ['', [Validators.email, Validators.required]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[&!@]).+$/)
      ]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    try {

      const { email, nombre, apellido, telefono } = this.registerForm.value;

      let fullPhone = this.selectedCountry().dialCode;
      if (this.selectedCountry().code === 'AR') {
        fullPhone += '9';
      }
      fullPhone += telefono;

      const userData = {
        ...this.registerForm.value,
        telefono: fullPhone
      };

      console.log("Datos: ", userData);

      const firebaseUser = await this.authService.register(userData);
      // await this.registrarActividadRegistro(firebaseUser.uid, nombre, apellido, email);

      // await this.authService.sendEmailVerification();

      // sessionStorage.setItem('pendingVerificationEmail', email);

      // this.router.navigate(['/verificar-email'], {
      // state: { email: email }
      // });

    } catch (error) {
      console.error('Error en el registro: ', error);
      alert('Hubo un error al registrar el usuario, Intenta de nuevo');
    } finally {
      this.isSubmitting = false;
    }
  }


  get nombre() { return this.registerForm.get('nombre'); }
  get apellido() { return this.registerForm.get('apellido'); }
  get telefono() { return this.registerForm.get('telefono'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }

  switchForm = output<void>();

  countries: Country[] = [
    { code: 'AR', name: 'Argentina', flagUrl: 'https://flagcdn.com/w40/ar.png', dialCode: '+54' },
    { code: 'ES', name: 'España', flagUrl: 'https://flagcdn.com/w40/es.png', dialCode: '+34' },
    { code: 'MX', name: 'México', flagUrl: 'https://flagcdn.com/w40/mx.png', dialCode: '+52' },
    { code: 'CL', name: 'Chile', flagUrl: 'https://flagcdn.com/w40/cl.png', dialCode: '+56' },
    { code: 'UY', name: 'Uruguay', flagUrl: 'https://flagcdn.com/w40/uy.png', dialCode: '+598' },
    { code: 'CO', name: 'Colombia', flagUrl: 'https://flagcdn.com/w40/co.png', dialCode: '+57' },
    { code: 'PE', name: 'Perú', flagUrl: 'https://flagcdn.com/w40/pe.png', dialCode: '+51' },
    { code: 'VE', name: 'Venezuela', flagUrl: 'https://flagcdn.com/w40/ve.png', dialCode: '+58' },
    { code: 'EC', name: 'Ecuador', flagUrl: 'https://flagcdn.com/w40/ec.png', dialCode: '+593' },
    { code: 'PY', name: 'Paraguay', flagUrl: 'https://flagcdn.com/w40/py.png', dialCode: '+595' },
    { code: 'BO', name: 'Bolivia', flagUrl: 'https://flagcdn.com/w40/bo.png', dialCode: '+591' },
  ];

  selectedCountry = signal<Country>(this.countries[0]); // Default Argentina
  isDropdownOpen = signal(false);

  onSwitchToLogin() {
    this.switchForm.emit();
  }

  toggleDropdown() {
    this.isDropdownOpen.update(v => !v);
  }

  selectCountry(country: Country) {
    this.selectedCountry.set(country);
    this.isDropdownOpen.set(false);
  }

  async loginWithGoogle() {
    try {
      await this.authService.loginWithGoogle();
    } catch (error) {
      console.error('Error en login con Google:', error);
    }
  }
}
