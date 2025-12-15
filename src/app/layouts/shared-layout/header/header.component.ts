import { CommonModule } from '@angular/common';
import { Component, signal, inject, AfterViewChecked, Signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GsapAnimationService } from '../../../core/services/gsap-animation.service';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../core/interfaces/usuario.model';


declare const HSStaticMethods: any;

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements AfterViewChecked {

  private _gsapService = inject(GsapAnimationService);
  theme = signal<'light' | 'dark'>('light');
  private authService: AuthService = inject(AuthService);
  // private taskService: TaskService = inject(TaskService);

  currentUser: Signal<Usuario | null | undefined> = this.authService.currentUser;


  logOut(): void {
    // Podemos agregar una confirmacion con .then
    this.authService.logOut();
  }
  hoverButton(event: MouseEvent, element: HTMLElement) {
    this._gsapService.hoverFill(event, element);
  }

  leaveButton(event: MouseEvent, element: HTMLElement) {
    this._gsapService.leaveFill(event, element);
  }

  ngAfterViewChecked() {
    HSStaticMethods.autoInit();
  }
}
