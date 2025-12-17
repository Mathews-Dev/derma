import { Component, inject, OnInit, signal, Signal, WritableSignal, effect } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Usuario, Profesional, HorariosLaborales, HonorariosPorTratamiento, DocumentosProfesional } from '../../../core/interfaces/usuario.model';
import { ScheduleSelectorComponent } from '../../../shared/components/schedule-selector/schedule-selector.component';
import { ProfessionalDocsComponent } from '../../../shared/components/professional-docs/professional-docs.component';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ScheduleSelectorComponent, ProfessionalDocsComponent],
  templateUrl: './mi-perfil.component.html',
  styleUrl: './mi-perfil.component.css'
})
export class MiPerfilComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  public authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);

  // Usuario Actual
  currentUser: Signal<Usuario | null | undefined> = this.authService.currentUser;
  profileForm: FormGroup;

  isSubmitting: boolean = false;
  imagenBase64Preview: WritableSignal<string | null> = signal(null);

  // Tabs
  activeTab = signal<'personal' | 'profesional'>('personal');

  constructor() {
    this.profileForm = this.formBuilder.group({
      // -- Personal --
      email: [{ value: '', disabled: true }],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      telefono: ['', Validators.required],
      dni: ['', Validators.required],
      perfil: [''], // foto url o base64
      rol: [''], // Para checkear rol

      // -- Profesional --
      numeroMatriculaNacional: [''],
      numeroMatriculaProvincial: [''],
      duracionConsulta: [30],
      precioConsulta: [0],
      tituloProfesional: [''], // Ej: Cirujano Plástico
      horariosLaborales: [{}], // Initialize with empty object instead of null
      honorarios: this.formBuilder.array([]), // Array de objetos
      documentos: this.formBuilder.group({
        dniFrente: [''],
        dniReverso: [''],
        matriculaNacional: [''],
        matriculaProvincial: [''],
        diploma: ['']
      })
    });

    // React to user changes automatically (handles page reload race condition)
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.patchUserData(user);
      }
    });
  }

  get isDermatologo(): boolean {
    return this.currentUser()?.rol === 'dermatologo';
  }

  get honorarios(): FormArray {
    return this.profileForm.get('honorarios') as FormArray;
  }

  ngOnInit(): void {
    // Logic moved to effect()
  }

  patchUserData(user: Usuario) {
    // 1. Datos Personales
    this.profileForm.patchValue({
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      telefono: user.telefono,
      dni: user.dni,
      perfil: user.fotoPerfil,
      rol: user.rol
    });
    this.imagenBase64Preview.set(user.fotoPerfil || null);

    // 2. Datos Profesional (si es dermatologo)
    if (user.rol === 'dermatologo') {
      const prof = user as Profesional;
      this.profileForm.patchValue({
        numeroMatriculaNacional: prof.numeroMatriculaNacional || '',
        numeroMatriculaProvincial: prof.numeroMatriculaProvincial || '',
        duracionConsulta: prof.duracionConsulta || 30,
        precioConsulta: prof.precioConsulta || 0,
        tituloProfesional: prof.tituloProfesional || '',
        horariosLaborales: prof.horariosLaborales || {},
      });

      // Patch Honorarios (FormArray)
      this.honorarios.clear();
      if (prof.honorarios && prof.honorarios.length > 0) {
        prof.honorarios.forEach(h => {
          this.addHonorario(h);
        });
      }

      // Patch Documentos
      if (prof.documentos) {
        this.profileForm.get('documentos')?.patchValue(prof.documentos);
      }
    }
  }

  // --- MÉTODOS UI ---

  switchTab(tab: 'personal' | 'profesional') {
    this.activeTab.set(tab);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.readFile(file).then(result => {
        this.imagenBase64Preview.set(result);
        this.profileForm.patchValue({ perfil: result });
        this.profileForm.markAsDirty();
      });
    }
  }

  updateDocs(newDocs: DocumentosProfesional) {
    this.profileForm.get('documentos')?.patchValue(newDocs);
    this.profileForm.markAsDirty();
  }


  // --- Schedule ---
  onScheduleChange(schedule: HorariosLaborales) {
    this.profileForm.patchValue({ horariosLaborales: schedule });
    this.profileForm.markAsDirty();
  }

  // --- Honorarios ---
  addHonorario(data?: HonorariosPorTratamiento) {
    const group = this.formBuilder.group({
      nombre: [data?.nombre || '', Validators.required],
      precio: [data?.precio || 0, Validators.required],
      idEspecialidad: [data?.idEspecialidad || 'general'] // default value
    });
    this.honorarios.push(group);
    this.profileForm.markAsDirty();
  }

  removeHonorario(index: number) {
    this.honorarios.removeAt(index);
    this.profileForm.markAsDirty();
  }


  // --- Submit ---
  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      alert('Por favor complete los campos obligatorios');
      return;
    }

    if (!this.profileForm.dirty) {
      return;
    }

    const user = this.currentUser();
    if (!user) return;

    this.isSubmitting = true;
    try {
      const formVal = this.profileForm.value;

      // Base Data
      const dataToUpdate: any = {
        nombre: formVal.nombre,
        apellido: formVal.apellido,
        telefono: formVal.telefono,
        dni: formVal.dni,
        fotoPerfil: formVal.perfil // mapped back to fotoPerfil
      };

      // Si es profesional, agregamos los campos extra
      if (this.isDermatologo) {
        dataToUpdate['numeroMatriculaNacional'] = formVal.numeroMatriculaNacional;
        dataToUpdate['numeroMatriculaProvincial'] = formVal.numeroMatriculaProvincial;
        dataToUpdate['duracionConsulta'] = formVal.duracionConsulta;
        dataToUpdate['precioConsulta'] = formVal.precioConsulta;
        dataToUpdate['tituloProfesional'] = formVal.tituloProfesional;
        dataToUpdate['horariosLaborales'] = formVal.horariosLaborales;
        dataToUpdate['honorarios'] = formVal.honorarios;
        dataToUpdate['documentos'] = formVal.documentos;
      }

      await this.firestoreService.updateDocument('usuarios', user.uid, dataToUpdate);
      alert('Perfil actualizado correctamente');
      this.profileForm.markAsPristine();

    } catch (error) {
      console.error('Error actualizando perfil', error);
      alert('Error al actualizar el perfil');
    } finally {
      this.isSubmitting = false;
    }
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
