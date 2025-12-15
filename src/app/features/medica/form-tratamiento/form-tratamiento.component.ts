import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Tratamiento, CategoriaTratamiento } from '../../../core/interfaces/tratamiento.model';
import { Usuario, RolUsuario, EstadoUsuario } from '../../../core/interfaces/usuario.model';
import { Profesional } from '../../../core/interfaces/profesional.model';

@Component({
  selector: 'app-form-tratamiento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form-tratamiento.component.html',
  styleUrl: './form-tratamiento.component.css'
})
export class FormTratamientoComponent implements OnInit {

  private fb = inject(FormBuilder);
  private firestoreService = inject(FirestoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form: FormGroup;
  isEditMode = signal(false);
  treatmentId = signal<string | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);

  // Lista completa de dermatólogos disponibles (Tipo Profesional)
  profesionalesDisponibles = signal<Profesional[]>([]);

  // UIDs de profesionales seleccionados en el formulario
  selectedProfesionales = signal<string[]>([]);

  categorias: CategoriaTratamiento[] = ['facial', 'corporal', 'piel', 'capilar', 'bienestar', 'otro'];

  constructor() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      categoria: ['', Validators.required],
      etiquetas: [''], // Nuevo campo para tags
      descripcion: ['', Validators.required],
      descripcionCorta: ['', Validators.required],
      precio: [0, [Validators.required, Validators.min(0)]],
      duracion: [30, [Validators.required, Validators.min(15)]],
      sesionesRecomendadas: [1, [Validators.min(1)]],
      imagenPrincipal: [''],
      videoUrl: [''],

      // TextAreas para Arrays (se convierten al guardar)
      beneficios: [''],
      contraindicaciones: [''],
      instruccionesPre: [''],
      instruccionesPost: [''],

      resultadosEsperados: [''],
      tiempoRecuperacion: [''],

      activo: [true],
      destacado: [false],
      orden: [0]
    });
  }

  async ngOnInit() {
    this.isLoading.set(true);
    await this.cargarProfesionales();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.treatmentId.set(id);
      await this.cargarTratamiento(id);
    }
    this.isLoading.set(false);
  }

  private async cargarProfesionales() {
    try {
      this.firestoreService.getCollection<Usuario>('usuarios').subscribe(usuarios => {
        // Filtramos y casteamos a Profesional porque sabemos que los dermatólogos tienen esa estructura
        const dermatos = usuarios
          .filter(u => u.rol === RolUsuario.DERMATOLOGO && u.estado === EstadoUsuario.ACTIVO) as unknown as Profesional[];
        this.profesionalesDisponibles.set(dermatos);
      });
    } catch (error) {
      console.error('Error cargando profesionales', error);
    }
  }

  private async cargarTratamiento(id: string) {
    try {
      const doc = await this.firestoreService.getDocument<Tratamiento>('tratamientos', id);
      if (doc) {
        // Convertir arrays a string con saltos de línea para los textareas
        const formValue = {
          ...doc,
          beneficios: doc.beneficios?.join('\n') || '',
          contraindicaciones: doc.contraindicaciones?.join('\n') || '',
          instruccionesPre: doc.instruccionesPre?.join('\n') || '',
          instruccionesPost: doc.instruccionesPost?.join('\n') || '',
          etiquetas: doc.etiquetas?.join('\n') || ''
        };
        this.form.patchValue(formValue);

        if (doc.profesionalesSugeridos) {
          this.selectedProfesionales.set(doc.profesionalesSugeridos);
        }
      }
    } catch (error) {
      console.error('Error cargando tratamiento', error);
    }
  }

  toggleProfesional(uid: string) {
    this.selectedProfesionales.update(selected => {
      if (selected.includes(uid)) {
        return selected.filter(id => id !== uid);
      } else {
        return [...selected, uid];
      }
    });
  }

  private sanitizer = inject(DomSanitizer);

  // ... (inside class)

  getSafeVideoUrl(): SafeResourceUrl | null {
    const url = this.form.get('videoUrl')?.value;
    if (!url) return null;

    // Extraer ID de YouTube (Soporta URL normal, Shorts, youtu.be)
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      const videoId = match[2];
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
    }

    return null;
  }

  // Helper para formatear duración en tiempo real
  getFormattedDuration(): string {
    const minutos = this.form.get('duracion')?.value;
    if (!minutos) return '';
    if (minutos < 60) return `${minutos} min`;

    const horas = Math.floor(minutos / 60);
    const minRestantes = minutos % 60;

    return minRestantes > 0
      ? `${horas} h ${minRestantes} min`
      : `${horas} h`;
  }

  // Helper para simular subida de imagen (UI feedback)
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      console.log('Archivo seleccionado (simulado):', file.name);
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    try {
      const formVal = this.form.value;

      // Helper para convertir textarea a array
      const textToArray = (text: string) => text ? text.split('\n').filter((l: string) => l.trim().length > 0) : [];

      const data: Partial<Tratamiento> = {
        ...formVal,
        beneficios: textToArray(formVal.beneficios),
        contraindicaciones: textToArray(formVal.contraindicaciones),
        instruccionesPre: textToArray(formVal.instruccionesPre),
        instruccionesPost: textToArray(formVal.instruccionesPost),
        etiquetas: textToArray(formVal.etiquetas),
        profesionalesSugeridos: this.selectedProfesionales()
      };

      if (this.isEditMode() && this.treatmentId()) {
        await this.firestoreService.updateDocument('tratamientos', this.treatmentId()!, data);
      } else {
        await this.firestoreService.addDocument('tratamientos', data);
      }

      this.router.navigate(['/admin/gestion-tratamientos']);
    } catch (error) {
      console.error('Error guardando tratamiento', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
