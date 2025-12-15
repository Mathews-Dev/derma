import { Component, ElementRef, ViewChild, AfterViewInit, inject, signal } from '@angular/core';
import { LoginComponent } from "../../auth/login/login/login.component";
import { RegisterPacienteComponent } from "../../auth/register/register-paciente/register-paciente.component";
import { CommonModule } from '@angular/common';
import { ScrollService } from '../../../core/services/scroll.service';
import { gsap } from 'gsap';
import { FooterComponent } from "../../../layouts/public-layout/components/footer/footer.component";

@Component({
  selector: 'app-home',
  imports: [CommonModule, LoginComponent, RegisterPacienteComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('authContainer') authContainer!: ElementRef<HTMLElement>;

  private scrollService = inject(ScrollService);

  isLogin = signal(true);

  ngAfterViewInit() {
    this.scrollService.setScrollContainer(this.scrollContainer.nativeElement);
  }

  toggleForm() {
    const container = this.authContainer?.nativeElement;

    if (!container) return;

    // Determinar dirección basada en el estado actual
    const goingToRegister = this.isLogin(); // Si estamos en login, vamos a register
    const xDirection = goingToRegister ? 100 : -100; // Derecha si vamos a register, izquierda si vamos a login

    // Animación de salida
    gsap.to(container, {
      opacity: 0,
      x: xDirection,
      duration: 0.4,
      ease: "power2.inOut"
    });

    // Cambiar el estado después de que comience la animación
    setTimeout(() => {
      this.isLogin.set(!this.isLogin());

      // Resetear posición, luego animar entrada desde la dirección opuesta
      gsap.fromTo(container,
        {
          opacity: 0,
          x: -xDirection // Entra del lado opuesto
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.4,
          ease: "power2.inOut"
        }
      );
    }, 150);
  }
}
