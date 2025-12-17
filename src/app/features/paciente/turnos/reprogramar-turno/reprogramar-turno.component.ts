import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TurnoService } from '../../../../core/services/turno.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { Turno } from '../../../../core/interfaces/turno.model';
import { Profesional } from '../../../../core/interfaces/profesional.model';
import { CalendarioDisponibilidadComponent } from '../calendario-disponibilidad/calendario-disponibilidad.component';

@Component({
  selector: 'app-reprogramar-turno',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CalendarioDisponibilidadComponent],
  templateUrl: './reprogramar-turno.component.html',
  styleUrl: './reprogramar-turno.component.css'
})
export class ReprogramarTurnoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private turnoService = inject(TurnoService);
  private firestoreService = inject(FirestoreService);
  private fb = inject(FormBuilder);

  turnoId: string | null = null;
  turnoActual = signal<Turno | null>(null);
  profesional = signal<Profesional | null>(null);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);

  // Nueva selección
  nuevaFecha = signal<Date | null>(null);
  nuevaHora = signal<string | null>(null);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      motivo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(250)]]
    });
  }

  ngOnInit(): void {
    this.turnoId = this.route.snapshot.paramMap.get('id');
    if (this.turnoId) {
      this.cargarDatosTurno(this.turnoId);
    }
  }

  async cargarDatosTurno(id: string): Promise<void> {
    try {
      const turnoData = await this.firestoreService.getDocumentById<Turno>('turnos', id);

      if (turnoData) {
        // Normalizar fecha
        const fechaTurno = (turnoData.fecha as any)?.toDate
          ? (turnoData.fecha as any).toDate()
          : new Date(turnoData.fecha);

        const turnoConFecha = { ...turnoData, fecha: fechaTurno };
        this.turnoActual.set(turnoConFecha);

        // 🛑 VALIDACIÓN 24 HORAS
        const ahora = new Date();
        const diferenciaMs = fechaTurno.getTime() - ahora.getTime();
        const horasRestantes = diferenciaMs / (1000 * 60 * 60);

        if (horasRestantes < 24) {
          alert('⚠️ No se puede reprogramar el turno con menos de 24 horas de anticipación.\n\nPor favor, comunícate con la administración.');
          this.router.navigate(['/paciente/mis-turnos']);
          return;
        }

        // Cargar profesional
        const profesional = await this.firestoreService.getDocumentById<Profesional>('usuarios', turnoData.profesionalId);
        if (profesional) {
          this.profesional.set(profesional);
        }
      } else {
        alert('Turno no encontrado');
        this.router.navigate(['/paciente/mis-turnos']);
      }
    } catch (error) {
      console.error('Error cargando turno:', error);
      alert('Error al cargar la información del turno');
      this.router.navigate(['/paciente/mis-turnos']);
    } finally {
      this.isLoading.set(false);
    }
  }

  onFechaHoraSeleccionada(data: { fecha: Date; hora: string }): void {
    this.nuevaFecha.set(data.fecha);
    this.nuevaHora.set(data.hora);
  }

  async confirmarReprogramacion(): Promise<void> {
    if (this.form.invalid || !this.nuevaFecha() || !this.nuevaHora() || !this.turnoId) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    try {
      await this.turnoService.reprogramarTurno(
        this.turnoId,
        this.nuevaFecha()!,
        this.nuevaHora()!,
        this.form.get('motivo')?.value
      );

      // Navegar a mis turnos con éxito
      this.router.navigate(['/paciente/mis-turnos']);
    } catch (error) {
      console.error('Error reprogramando:', error);
      alert('Hubo un error al reprogramar el turno. Por favor intenta nuevamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/paciente/mis-turnos']);
  }
}
