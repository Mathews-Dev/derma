import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgramarSesionComponent } from '../programar-sesion/programar-sesion.component';
import { Turno } from '../../../core/interfaces/turno.model';

@Component({
  selector: 'app-programar-sesion-standalone',
  standalone: true,
  imports: [CommonModule, ProgramarSesionComponent],
  templateUrl: './programar-sesion-standalone.component.html',
  styleUrl: './programar-sesion-standalone.component.css'
})
export class ProgramarSesionStandaloneComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  pacienteId = signal<string>('');
  profesionalId = signal<string>('');
  tratamientoId = signal<string>('');
  tratamientoNombre = signal<string>('');
  returnUrl = signal<string>('/medica/agenda');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.pacienteId.set(params['pacienteId'] || '');
      this.profesionalId.set(params['profesionalId'] || '');
      this.tratamientoId.set(params['tratamientoId'] || '');
      this.tratamientoNombre.set(params['tratamientoNombre'] || '');
      this.returnUrl.set(params['returnUrl'] || '/medica/agenda');
    });
  }

  onSesionProgramada(turno: Turno): void {
    alert(`✅ Próxima sesión programada para ${new Date(turno.fecha).toLocaleDateString()}`);
    this.router.navigate([this.returnUrl()]);
  }

  onCancelar(): void {
    this.router.navigate([this.returnUrl()]);
  }
}
