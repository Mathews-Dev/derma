import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TurnoService } from '../../../core/services/turno.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Turno } from '../../../core/interfaces/turno.model';
import { Paciente } from '../../../core/interfaces/paciente.model';
import { Tratamiento } from '../../../core/interfaces/tratamiento.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-consulta-activa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consulta-activa.component.html',
  styleUrl: './consulta-activa.component.css'
})
export class ConsultaActivaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestoreService = inject(FirestoreService);

  turnoId = signal<string | null>(null);
  turno = signal<Turno | null>(null);
  paciente = signal<Paciente | null>(null);
  tratamientos = signal<Tratamiento[]>([]);

  loading = signal<boolean>(true);
  loadingTratamientos = signal<boolean>(true);

  // Grouped Treatments for UI
  tratamientosFaciales = signal<Tratamiento[]>([]);
  tratamientosCorporales = signal<Tratamiento[]>([]);
  tratamientosQuirurgicos = signal<Tratamiento[]>([]);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('turnoId');
      if (id) {
        this.turnoId.set(id);
        this.loadData(id);
        this.loadTratamientos();
      }
    });
  }

  async loadData(id: string) {
    try {
      this.loading.set(true);
      // 1. Get Turno
      const turnoData = await this.firestoreService.getDocumentById<Turno>('turnos', id);
      if (turnoData) {
        this.turno.set(turnoData);

        // 2. Get Paciente
        if (turnoData.pacienteId) {
          const pacienteData = await this.firestoreService.getDocumentById<Paciente>('usuarios', turnoData.pacienteId);
          this.paciente.set(pacienteData || null);
        }
      }
    } catch (error) {
      console.error('Error loading consultation data', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadTratamientos() {
    try {
      this.loadingTratamientos.set(true);
      // Fetch all active treatments
      // Note: Ideally filter by 'activo' == true if your service supports it, otherwise filter client-side
      const allTratamientos$ = this.firestoreService.getCollection<Tratamiento>('tratamientos');

      // Convert Observable to Promise
      const allTratamientos = await firstValueFrom(allTratamientos$);

      this.tratamientos.set(allTratamientos);

      // Group them
      this.tratamientosFaciales.set(allTratamientos.filter((t: Tratamiento) => t.categoria === 'facial'));
      this.tratamientosCorporales.set(allTratamientos.filter((t: Tratamiento) => t.categoria === 'corporal'));
      this.tratamientosQuirurgicos.set(allTratamientos.filter((t: Tratamiento) => t.categoria === 'quirurgico'));

    } catch (error) {
      console.error('Error loading treatments', error);
    } finally {
      this.loadingTratamientos.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/medica/agenda']);
  }
}
