import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, output, Output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InvitacionService } from '../../../../core/services/invitacion.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GsapAnimationService } from '../../../../core/services/gsap-animation.service';
import { SolicitudInvitacion } from '../../../../core/interfaces/solicitud-invitacion.model';


interface Country {
  code: string;
  name: string;
  flagUrl: string;
  dialCode: string;
}

@Component({
  selector: 'app-register-usuario-clinica',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-usuario-clinica.component.html',
  styleUrl: './register-usuario-clinica.component.css'
})
export class RegisterUsuarioClinicaComponent implements OnInit {
  @Output() toggleLogin = new EventEmitter<void>()

  onToggleLogin() {
    this.toggleLogin.emit()
  }
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invitacionService = inject(InvitacionService);
  private authService = inject(AuthService);
  private _gsapService = inject(GsapAnimationService);
  private fb = inject(FormBuilder);

  codigo: string = '';
  invitacion = signal<SolicitudInvitacion | null>(null);
  error = signal<string>('');
  isLoading = signal(true);
  isSubmitting = signal(false);

  formulario = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    dni: ['', Validators.required],
    telefono: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });


  ngOnInit() {
    this.validarInvitacionDelLink();
  }

  async validarInvitacionDelLink() {
    this.isLoading.set(true);

    try {
      this.codigo = this.route.snapshot.params['codigo'];

      if (!this.codigo) {
        this.router.navigate(['/home']);
        return;
      }

      const invitacion = await this.invitacionService.validarInvitacion(this.codigo);
      this.invitacion.set(invitacion);

    } catch (error: any) {
      this.error.set(error.message || 'Error validando la invitación');
    } finally {
      this.isLoading.set(false);
      // Seguridad extra: Si no hay invitación y no hay errores (caso raro), redirigir
      if (!this.invitacion() && !this.error()) {
        this.router.navigate(['/home']);
      }
    }
  }

  async onSubmit() {
    if (!this.formulario.valid) return;

    this.isSubmitting.set(true);

    try {
      const datosForm = this.formulario.value;
      const invitacion = this.invitacion();

      if (!invitacion) {
        throw new Error('Invitación no válida');
      }

      // Formatear teléfono
      const country = this.selectedCountry();
      let telefonoFormatted = datosForm.telefono;

      if (country.code === 'AR') {
        // Argentina: +54 9 ...
        telefonoFormatted = `${country.dialCode}9${datosForm.telefono}`;
      } else {
        telefonoFormatted = `${country.dialCode}${datosForm.telefono}`;
      }

      // Registrar al usuario
      const usuario = await this.authService.register({
        email: datosForm.email,
        password: datosForm.password,
        nombre: datosForm.nombre,
        apellido: datosForm.apellido,
        dni: datosForm.dni,
        telefono: telefonoFormatted,
        rol: invitacion.rol
      });

      // Marcar invitación como usada
      await this.invitacionService.marcarInvitacionComoUsada(
        this.codigo,
        usuario.uid
      );

      // Redirigir a login
      this.router.navigate(['/home']);
      alert('Registro exitoso. Por favor, inicia sesión');

    } catch (error: any) {
      this.error.set(error.message || 'Error al registrar');
    } finally {
      this.isSubmitting.set(false);
    }
  }

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

  toggleDropdown() {
    this.isDropdownOpen.update(v => !v);
  }

  selectCountry(country: Country) {
    this.selectedCountry.set(country);
    this.isDropdownOpen.set(false);
  }

  hoverButton(event: MouseEvent, element: HTMLElement) {
    this._gsapService.hoverFill(event, element);
  }

  leaveButton(event: MouseEvent, element: HTMLElement) {
    this._gsapService.leaveFill(event, element);
  }
}
