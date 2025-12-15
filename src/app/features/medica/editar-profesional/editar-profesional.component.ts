import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, WritableSignal, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FirestoreService } from '../../../core/services/firestore.service';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario, Profesional } from '../../../core/interfaces/usuario.model';
import { ProfessionalDocsComponent } from '../../../shared/components/professional-docs/professional-docs.component';

@Component({
  selector: 'app-editar-profesional',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ProfessionalDocsComponent],
  templateUrl: './editar-profesional.component.html',
  styleUrl: './editar-profesional.component.css'
})
export class EditarProfesionalComponent implements OnInit {
  private firestoreService: FirestoreService = inject(FirestoreService);
  private formBuilder: FormBuilder = inject(FormBuilder);
  route = inject(ActivatedRoute);
  public authService: AuthService = inject(AuthService);

  router: Router = inject(Router);

  // Usuario que se está editando
  usuarioData: Profesional | null = null;
  profileForm: FormGroup;

  isSubmitting = signal<boolean>(false);
  imagenBase64Preview: WritableSignal<string | null> = signal(null);

  constructor() {
    this.profileForm = this.formBuilder.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      dni: ['', Validators.required],
      telefono: ['', Validators.required],
      rol: ['', Validators.required],
      estado: ['', Validators.required],
      correoVerificado: [false],
      fotoPerfil: [''],
      // Campos de Profesional
      numeroMatriculaNacional: [''],
      numeroMatriculaProvincial: [''],
      duracionConsulta: [30],
      tituloProfesional: [''], // Ej: Cirujano Plástico
      horariosLaborales: [null]
    });
  }

  // Getters para validación
  get nombre() { return this.profileForm.get('nombre'); }
  get apellido() { return this.profileForm.get('apellido'); }
  get email() { return this.profileForm.get('email'); }
  get dni() { return this.profileForm.get('dni'); }
  get telefono() { return this.profileForm.get('telefono'); }
  get rol() { return this.profileForm.get('rol'); }
  get estado() { return this.profileForm.get('estado'); }
  get numeroMatriculaNacional() { return this.profileForm.get('numeroMatriculaNacional'); }
  get numeroMatriculaProvincial() { return this.profileForm.get('numeroMatriculaProvincial'); }
  get duracionConsulta() { return this.profileForm.get('duracionConsulta'); }

  get hasSchedules(): boolean {
    if (!this.usuarioData?.horariosLaborales) return false;
    return Object.values(this.usuarioData.horariosLaborales).some(arr => Array.isArray(arr) && arr.length > 0);
  }

  ngOnInit(): void {
    const usuarioId = this.route.snapshot.paramMap.get('id');
    if (!usuarioId) {
      return;
    }

    this.firestoreService.getDocumentById<Usuario>('usuarios', usuarioId).then(
      data => {
        if (data) {
          this.usuarioData = data as Profesional; // Guardar los datos del usuario (cast as Profesional)
          this.profileForm.patchValue({
            nombre: data.nombre,
            apellido: data.apellido,
            email: data.email,
            dni: data.dni,
            telefono: data.telefono,
            rol: data.rol,
            estado: data.estado,
            correoVerificado: data.correoVerificado,
            fotoPerfil: data.fotoPerfil
          });

          // Patch professional specific data if available
          if (data.rol === 'dermatologo') {
            const prof = data as Profesional;
            this.profileForm.patchValue({
              numeroMatriculaNacional: prof.numeroMatriculaNacional || '',
              numeroMatriculaProvincial: prof.numeroMatriculaProvincial || '',
              duracionConsulta: prof.duracionConsulta || 30,
              tituloProfesional: prof.tituloProfesional || ''
            });
          }

          this.imagenBase64Preview.set(data.fotoPerfil || null)
        }
      }
    );
  }

  async actualizarUsuario(): Promise<void> {
    const usuarioId = this.route.snapshot.paramMap.get('id');

    if (!usuarioId) {
      return;
    }

    this.isSubmitting.set(true);

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.isSubmitting.set(false);
      return;
    }

    const formValues = { ...this.profileForm.value };

    // No transformation needed for tituloProfesional (it's already a string)


    try {
      // Obtener usuario actual para comparar el rol anterior
      const usuarioActual = await this.firestoreService.getDocumentById<Usuario>('usuarios', usuarioId);

      if (!usuarioActual) {
        // Swal.fire('Error', 'Usuario no encontrado', 'error');
        return;
      }

      const rolAnterior = usuarioActual.rol;

      // Actualizar en Firestore
      // Actualizar en Firestore
      // Excluir email si no se debe editar o si se maneja aparte, pero aquí lo actualizamos todo según requerimiento
      await this.firestoreService.updateDocument('usuarios', usuarioId, formValues);

      // Swal.fire({
      //   title: '¡Actualizado!',
      //   text: 'Rol del Usuario Actualizado Correctamente',
      //   icon: 'success',
      //   timer: 2000,
      //   showConfirmButton: false
      // });
      console.log("Usuario actualizado correctamente");

      this.router.navigate(['/admin/gestion-profesionales']);
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      // Swal.fire('Error', 'No se pudo actualizar el usuario', 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const base64Coords = reader.result as string;
        this.profileForm.patchValue({ fotoPerfil: base64Coords });
        this.imagenBase64Preview.set(base64Coords);
      };
      reader.readAsDataURL(file);
    }
  }

  removerFoto(): void {
    this.profileForm.patchValue({ fotoPerfil: null });
    this.imagenBase64Preview.set(null);
  }

  verDocumento(base64: string): void {
    // If it's a full data URL, use it directly. If not, assume jpeg/png.
    // For safety, checking if it starts with data:
    let src = base64;
    if (!src.startsWith('data:')) {
      // Fallback or assume it's raw base64 of an image if we stored it that way
      // But typically we store data:image/jpeg;base64,...
      src = `data:image/jpeg;base64,${base64}`;
    }

    const win = window.open('');
    if (win) {
      win.document.write(`<iframe src="${src}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
      alert('Por favor habilite las ventanas emergentes para ver el documento.');
    }
  }
}
