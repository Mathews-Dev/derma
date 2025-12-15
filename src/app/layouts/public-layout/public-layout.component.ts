import { Component, inject, OnInit, signal } from '@angular/core';
import { Event, NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { HomeNavbarComponent } from "./components/home-navbar/home-navbar.component";

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterModule, HomeNavbarComponent],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.css'
})
export class PublicLayoutComponent implements OnInit {
  private router: Router = inject(Router);
  showNavbar = signal(true);

  ngOnInit() {
    // Verificar URL inicial
    this.checkNavbar(this.router.url);

    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.checkNavbar(event.urlAfterRedirects);
      }
    });
  }

  private checkNavbar(url: string) {
    // Ocultar navbar en rutas específicas
    const hiddenRoutes = ['/invite/'];
    const shouldHide = hiddenRoutes.some(route => url.includes(route));
    this.showNavbar.set(!shouldHide);
  }
}
