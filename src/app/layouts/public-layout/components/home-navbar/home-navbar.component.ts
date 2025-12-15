import { Component, OnInit, inject, signal, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ScrollService } from '../../../../core/services/scroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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
