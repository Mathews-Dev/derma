import { Component, OnInit, inject, signal, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ScrollService } from '../../../../core/services/scroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

declare const HSStaticMethods: any;

@Component({
  selector: 'app-home-navbar',
  imports: [CommonModule, RouterModule],
  templateUrl: './home-navbar.component.html',
  styleUrl: './home-navbar.component.css'
})
export class HomeNavbarComponent implements OnInit, AfterViewChecked {
  private scrollService = inject(ScrollService);
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  isDrawerOpen = signal(false);

  constructor() {
    gsap.registerPlugin(ScrollTrigger);
  }

  ngOnInit() {
    this.scrollService.scrollContainer$.subscribe(container => {
      if (container) {
        this.initScrollAnimation(container);
      }
    });

    // Iniciar tour si es la primera visita
    this.checkAndStartTour();
  }

  checkAndStartTour() {
    const hasSeenTour = localStorage.getItem('hasSeenNavTour');
    if (hasSeenTour) {
      setTimeout(() => this.startNavTour(), 1000);
    }
  }

  startNavTour() {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      popoverClass: 'driverjs-theme',
      steps: [
        {
          element: '[data-tour="servicios"]',
          popover: {
            title: 'Servicios',
            description: 'Descubre todos nuestros servicios dermatológicos y estéticos especializados.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="tratamientos"]',
          popover: {
            title: 'Tratamientos',
            description: 'Explora nuestra amplia gama de tratamientos faciales, corporales y quirúrgicos.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '[data-tour="nosotros"]',
          popover: {
            title: 'Nosotros',
            description: 'Conoce a nuestro equipo de profesionales y nuestra filosofía de atención personalizada.',
            side: 'bottom',
            align: 'end'
          }
        }
      ],
      onDestroyStarted: () => {
        localStorage.setItem('hasSeenNavTour', 'true');
        driverObj.destroy();
      }
    });

    driverObj.drive();
  }

  initScrollAnimation(scroller: HTMLElement) {
    const showAnim = gsap.from('app-home-navbar nav', {
      yPercent: -100,
      paused: true,
      duration: 0.2
    }).progress(1);

    ScrollTrigger.create({
      scroller: scroller,
      start: "top top",
      end: "max",
      onUpdate: (self) => {
        self.direction === -1 ? showAnim.play() : showAnim.reverse();
      }
    });
  }

  async logout() {
    await this.authService.logOut();
  }

  ngAfterViewChecked() {
    HSStaticMethods.autoInit();
  }

}
