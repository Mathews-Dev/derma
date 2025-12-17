import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TurnoService } from '../../../core/services/turno.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Turno, EstadoTurno } from '../../../core/interfaces/turno.model';
import { Paciente, TipoPiel, Alergia, FichaMedicaReducida } from '../../../core/interfaces/paciente.model';
import { Tratamiento } from '../../../core/interfaces/tratamiento.model';
import { TratamientoPacienteService } from '../../../core/services/tratamiento-paciente.service';
import { DurationFormatPipe } from '../../../core/pipes/duration-format.pipe';
import { ProgramarSesionComponent } from '../programar-sesion/programar-sesion.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-consulta-activa',
  standalone: true,
  imports: [CommonModule, FormsModule, DurationFormatPipe, ProgramarSesionComponent],
  templateUrl: './consulta-activa.component.html',
  styleUrl: './consulta-activa.component.css'
})
export class ConsultaActivaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestoreService = inject(FirestoreService);
  private turnoService = inject(TurnoService);
  private tratamientoPacienteService = inject(TratamientoPacienteService);

  turnoId = signal<string | null>(null);
  turno = signal<Turno | null>(null);
  paciente = signal<Paciente | null>(null);
  tratamientos = signal<Tratamiento[]>([]);

  loading = signal<boolean>(true);
  loadingTratamientos = signal<boolean>(true);

  // Anamnesis
  notasMedicas = signal<string>('');

  // Editable Patient Context
  editingEdad = signal<boolean>(false);
  newEdad = signal<number | null>(null);

  editingPiel = signal<boolean>(false);
  newPiel = signal<TipoPiel | null>(null);
  tipoPielOptions = Object.values(TipoPiel); // Expose enum values for dropdown

  // Editable Medical Data (Extended)
  editingDni = signal<boolean>(false);
  newDni = signal<string>('');

  // Lists (Chips)
  alergias = signal<Alergia[]>([]);
  medicamentos = signal<string[]>([]);
  antecedentes = signal<string[]>([]);

  // Specific Fields
  cicatrizacion = signal<'normal' | 'queloide' | 'atrofica'>('normal');
  tipoSangre = signal<string>(''); // For surgery

  // Temporary Inputs for adding to lists
  tempAlergiaNombre = signal('');
  tempAlergiaTipo = signal<'medicamento' | 'ingrediente' | 'otro'>('medicamento');
  tempMedicamento = signal('');
  tempAntecedente = signal('');

  // Treatment Selection State
  selectedTratamiento = signal<Tratamiento | null>(null);
  showConsentModal = signal<boolean>(false);
  consentFile = signal<File | null>(null); // For surgical consent

  // Scheduling Modal State
  showSchedulingModal = signal<boolean>(false);
  schedulingData = signal<{ pacienteId: string; profesionalId: string; tratamientoNombre: string } | null>(null);

  // Grouped Treatments for UI

  // Grouped Treatments for UI
  tratamientosFaciales = signal<Tratamiento[]>([]);
  tratamientosCorporales = signal<Tratamiento[]>([]);
  tratamientosQuirurgicos = signal<Tratamiento[]>([]);
  tratamientosOtros = signal<Tratamiento[]>([]);

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

          // Pre-fill editable fields locally
          if (pacienteData) {
            this.newEdad.set(pacienteData.edad || null);
            this.newPiel.set(pacienteData.perfilEstetico?.biotipo || null);
            this.newDni.set(pacienteData.dni || '');

            // Ficha Medica Init
            const ficha = pacienteData.fichaMedica || {};
            this.alergias.set(ficha.alergias || []);
            this.medicamentos.set(ficha.medicamentosActuales || []);
            this.antecedentes.set(ficha.antecedentesEsteticos || []);
            this.cicatrizacion.set(ficha.cicatrizacion || 'normal');

            // Perfil Estetico Extra
            this.tipoSangre.set(pacienteData.perfilEstetico?.tipoSangre || '');
          }
        }

        // 3. Pre-fill Anamnesis if exists (notasProfesional)
        if (turnoData && turnoData.notasProfesional) {
          this.notasMedicas.set(turnoData.notasProfesional);
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

      // Catch-all for others (piel, capilar, bienestar, otro)
      this.tratamientosOtros.set(allTratamientos.filter((t: Tratamiento) =>
        !['facial', 'corporal', 'quirurgico'].includes(t.categoria)
      ));

    } catch (error) {
      console.error('Error loading treatments', error);
    } finally {
      this.loadingTratamientos.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/medica/agenda']);
  }

  // ==================== PATIENT EDIT LOGIC ====================

  toggleEditEdad() {
    this.editingEdad.update(v => !v);
    if (this.editingEdad() && this.paciente()) {
      this.newEdad.set(this.paciente()!.edad || null);
    }
  }

  async saveEdad() {
    if (!this.paciente() || this.newEdad() === null) return;
    try {
      await this.firestoreService.updateDocument('usuarios', this.paciente()!.uid, { edad: this.newEdad() });
      // Update local state
      this.paciente.update(p => p ? { ...p, edad: this.newEdad()! } : null);
      this.editingEdad.set(false);
    } catch (e) {
      console.error('Error saving edad', e);
    }
  }

  toggleEditPiel() {
    this.editingPiel.update(v => !v);
    if (this.editingPiel() && this.paciente()) {
      this.newPiel.set(this.paciente()!.perfilEstetico?.biotipo || null);
    }
  }

  async savePiel() {
    if (!this.paciente()) return;
    try {
      // Note: Assuming 'perfilEstetico' structure exists. If deeply nested update is needed, use dot notation key if supported or merge.
      // Firestore update with dot notation for nested fields:
      await this.firestoreService.updateDocument('usuarios', this.paciente()!.uid, {
        'perfilEstetico.biotipo': this.newPiel()
      });

      // Update local state deeply
      const current = this.paciente()!;
      const perfil = current.perfilEstetico || { biotipo: TipoPiel.NORMAL, fototipo: 'I' as any, preocupaciones: [], objetivos: [] };
      this.paciente.set({
        ...current,
        perfilEstetico: { ...perfil, biotipo: this.newPiel() as any }
      });

      this.editingPiel.set(false);
    } catch (e) {
      console.error('Error saving piel', e);
    }
  }

  // ==================== MEDICAL DATA EDIT LOGIC ====================

  toggleEditDni() {
    this.editingDni.update(v => !v);
    if (this.editingDni() && this.paciente()) {
      this.newDni.set(this.paciente()?.dni || '');
    }
  }

  async saveDni() {
    if (!this.paciente()) return;
    try {
      await this.firestoreService.updateDocument('usuarios', this.paciente()!.uid, { dni: this.newDni() });
      this.paciente.update(p => p ? { ...p, dni: this.newDni() } : null);
      this.editingDni.set(false);
    } catch (e) { console.error(e); }
  }

  // --- Alergias ---
  async addAlergia() {
    if (!this.tempAlergiaNombre().trim()) return;
    const nueva: Alergia = {
      nombre: this.tempAlergiaNombre(),
      tipo: this.tempAlergiaTipo(),
      severidad: 'moderada' // Default, could add selector
    };

    const updated = [...this.alergias(), nueva];
    await this.updateFichaMedica({ alergias: updated });
    this.alergias.set(updated);
    this.tempAlergiaNombre.set('');
  }

  async removeAlergia(index: number) {
    const updated = this.alergias().filter((_, i) => i !== index);
    await this.updateFichaMedica({ alergias: updated });
    this.alergias.set(updated);
  }

  // --- Medicamentos ---
  async addMedicamento() {
    if (!this.tempMedicamento().trim()) return;
    const updated = [...this.medicamentos(), this.tempMedicamento()];
    await this.updateFichaMedica({ medicamentosActuales: updated });
    this.medicamentos.set(updated);
    this.tempMedicamento.set('');
  }

  async removeMedicamento(index: number) {
    const updated = this.medicamentos().filter((_, i) => i !== index);
    await this.updateFichaMedica({ medicamentosActuales: updated });
    this.medicamentos.set(updated);
  }

  // --- Antecedentes ---
  async addAntecedente() {
    if (!this.tempAntecedente().trim()) return;
    const updated = [...this.antecedentes(), this.tempAntecedente()];
    await this.updateFichaMedica({ antecedentesEsteticos: updated });
    this.antecedentes.set(updated);
    this.tempAntecedente.set('');
  }
  async removeAntecedente(index: number) {
    const updated = this.antecedentes().filter((_, i) => i !== index);
    await this.updateFichaMedica({ antecedentesEsteticos: updated });
    this.antecedentes.set(updated);
  }

  // --- Cicatrizacion & Tipo Sangre ---
  async updateCicatrizacion(val: 'normal' | 'queloide' | 'atrofica') {
    this.cicatrizacion.set(val);
    await this.updateFichaMedica({ cicatrizacion: val });
  }

  async saveTipoSangre() {
    if (!this.paciente()) return;
    try {
      await this.firestoreService.updateDocument('usuarios', this.paciente()!.uid, {
        'perfilEstetico.tipoSangre': this.tipoSangre()
      });
    } catch (e) { console.error(e); }
  }

  // Helper
  private async updateFichaMedica(partial: Partial<FichaMedicaReducida>) {
    if (!this.paciente()) return;
    // We need to construct the update object properly. 
    // Firestore 'dot notation' for updating fields inside a map is safest.
    const updates: any = {};
    Object.keys(partial).forEach(key => {
      updates[`fichaMedica.${key}`] = (partial as any)[key];
    });

    try {
      await this.firestoreService.updateDocument('usuarios', this.paciente()!.uid, updates);
    } catch (e) {
      console.error('Error updating ficha medica', e);
    }
  }

  // ==================== TREATMENT LOGIC ====================

  selectTratamiento(t: Tratamiento) {
    this.selectedTratamiento.set(t);
    if (t.categoria === 'quirurgico') {
      this.showConsentModal.set(true);
    } else {
      // Direct confirmation or just selection? 
      // Plan says: "Al seleccionar, agenda la siguiente cita como tipo Sesión"
      // Let's create it immediately or ask for confirmation.
      // For UX, better to ask "Confirmar inicio de tratamiento X?"
      // For now, let's treat selection as "Staging" and then have a "Confirmar" button in UI or auto-confirm.
      // Given the UI in HTML, the buttons were just cards. 
      // I will make the selection trigger the action.
      this.confirmarTratamiento(t);
    }
  }

  async confirmarTratamiento(t: Tratamiento) {
    if (!this.paciente() || !this.turno()) return;

    if (confirm(`¿Iniciar tratamiento "${t.nombre}" y finalizar la consulta actual?`)) {
      await this.procesarTratamiento(t);
    }
  }

  async procesarTratamiento(t: Tratamiento) {
    this.loading.set(true);
    try {
      // 1. Save Anamnesis to Turno
      if (this.notasMedicas()) {
        await this.turnoService.actualizarTurno(this.turnoId()!, { notasProfesional: this.notasMedicas() });
      }

      // 2. Create TratamientoPaciente
      await this.tratamientoPacienteService.crearTratamientoPaciente({
        pacienteId: this.paciente()!.uid,
        tratamientoId: t.id,
        nombreTratamiento: t.nombre,
        profesionalId: this.turno()!.profesionalId,
        profesionalNombre: 'Dra. Derma', // Should fetch professional name or get from auth
        sesionesTotales: t.sesionesRecomendadas,
        estado: 'programado'
      });

      // 3. Complete current Turno
      await this.turnoService.actualizarEstado(this.turnoId()!, 'completado' as any); // Type cast if needed

      // 4. Open Scheduling Modal instead of redirecting
      this.schedulingData.set({
        pacienteId: this.paciente()!.uid,
        profesionalId: this.turno()!.profesionalId,
        tratamientoNombre: t.nombre
      });
      this.showSchedulingModal.set(true);

    } catch (e) {
      console.error('Error processing treatment', e);
    } finally {
      this.loading.set(false);
    }
  }

  // Handle successful session scheduling
  onSesionProgramada(turno: Turno): void {
    this.showSchedulingModal.set(false);
    alert(`✅ Sesión programada exitosamente para ${new Date(turno.fecha).toLocaleDateString()}`);
    // Navigate back to agenda
    this.router.navigate(['/medica/agenda']);
  }

  // Handle scheduling cancellation - return to consultation view
  onCancelarProgramacion(): void {
    this.showSchedulingModal.set(false);
    // Stay on consultation page, just hide scheduling step
  }
}
