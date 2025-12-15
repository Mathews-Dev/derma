import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { FirestoreService } from '../../../core/services/firestore.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Usuario } from '../../../core/interfaces/usuario.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editar-usuario',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './editar-usuario.component.html',
  styleUrl: './editar-usuario.component.css'
})
export class EditarUsuarioComponent implements OnInit {
  private firestoreService: FirestoreService = inject(FirestoreService);
  private formBuilder: FormBuilder = inject(FormBuilder);
  route = inject(ActivatedRoute);
  public authService: AuthService = inject(AuthService);

  router: Router = inject(Router);

  // Usuario que se está editando
  usuarioData: Usuario | null = null;
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
      fotoPerfil: ['']
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

  ngOnInit(): void {
    const usuarioId = this.route.snapshot.paramMap.get('id');
    if (!usuarioId) {
      return;
    }

    this.firestoreService.getDocumentById<Usuario>('usuarios', usuarioId).then(
      data => {
        if (data) {
          this.usuarioData = data; // Guardar los datos del usuario
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

    const formValues = this.profileForm.value;

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

      this.router.navigate(['/admin/gestion-usuarios']);
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
}
