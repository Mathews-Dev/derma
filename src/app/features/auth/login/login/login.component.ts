import { CommonModule } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  switchForm = output<void>();

  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  formulario = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = signal(false);
  error = signal<string>('');

  onSwitchToRegister() {
    this.switchForm.emit();
  }

  async onSubmit() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    try {
      const { email, password } = this.formulario.value;
      await this.authService.login({ email, password });
    } catch (error: any) {
      this.error.set(error.message || 'Error al iniciar sesión');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithGoogle() {
    this.isLoading.set(true);
    try {
      await this.authService.loginWithGoogle();
    } catch (error: any) {
      console.error('Error en login con Google:', error);
      this.error.set(error.message || 'Error al iniciar sesión con Google');
    } finally {
      // isLoading set to false managed by navigation in auth service or here if error
      // But since AuthService usually redirects, we might keep it true or handle simple error case
      this.isLoading.set(false);
    }
  }
}
