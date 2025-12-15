import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from "@angular/router";
import { HomeNavbarComponent } from "../public-layout/components/home-navbar/home-navbar.component";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paciente-layout',
  imports: [RouterOutlet, HomeNavbarComponent, CommonModule, RouterModule],
  templateUrl: './paciente-layout.component.html',
  styleUrl: './paciente-layout.component.css'
})
export class PacienteLayoutComponent {

}
