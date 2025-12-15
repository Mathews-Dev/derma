import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Paciente } from '../../../../core/interfaces/paciente.model';

@Component({
  selector: 'app-dashboard-paciente',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-paciente.component.html',
  styleUrl: './dashboard-paciente.component.css'
})
export class DashboardPacienteComponent {
  private authService = inject(AuthService);

  // User State
  currentUser = computed(() => this.authService.currentUser() as Paciente | undefined);

  // Example Derived State (Mocked)
  rutinaManana = computed(() => this.currentUser()?.rutina?.manana || []);
  rutinaNoche = computed(() => this.currentUser()?.rutina?.noche || []);

  // Just a simple logic to show "3 of 5 products applied" (mocked active state)
  totalProducts = computed(() => this.rutinaManana().length + this.rutinaNoche().length);
}
