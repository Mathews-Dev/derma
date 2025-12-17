import { Component, inject, Output, EventEmitter } from '@angular/core';
import { RouterModule } from "@angular/router";
import { GsapAnimationService } from '../../../core/services/gsap-animation.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

  private _gsapService = inject(GsapAnimationService);
  public authService = inject(AuthService);

  @Output() openInvite = new EventEmitter<void>();

  hoverButton(event: MouseEvent, element: HTMLElement, isActive: boolean) {
    if (isActive) return;
    this._gsapService.hoverFill(event, element);
  }

  leaveButton(event: MouseEvent, element: HTMLElement, isActive: boolean) {
    if (isActive) return;
    this._gsapService.leaveFill(event, element);
  }

  openInvitationModal() {
    this.openInvite.emit();
  }
}
