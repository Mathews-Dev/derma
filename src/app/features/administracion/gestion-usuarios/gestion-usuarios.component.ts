import { Component, computed, inject, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { FirestoreService } from '../../../core/services/firestore.service';
import { AuthService } from '../../../core/services/auth.service';
import { EstadoUsuario, RolUsuario, Usuario } from '../../../core/interfaces/usuario.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-gestion-usuarios',
  imports: [CommonModule, RouterModule],
  templateUrl: './gestion-usuarios.component.html',
  styleUrl: './gestion-usuarios.component.css'
})
export class GestionUsuariosComponent implements OnInit {

  private firestoreService = inject(FirestoreService);
  private authService: AuthService = inject(AuthService);

  // Datos y estado
  usuariosOriginales: WritableSignal<Usuario[]> = signal([]);
  RolUsuario = RolUsuario;
  EstadoUsuario = EstadoUsuario;
  isLoading = signal(true);

  // Búsqueda y paginación
  terminoBusqueda = signal('');
  paginaActual = signal(1);
  usuariosPorPagina = signal(6); // cambialo si querés más por página

  // Normalizar texto (para búsquedas)
  private normalizarTexto(texto?: string): string {
    if (!texto) return '';
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Filtrado por término de búsqueda
  filteredUsers: Signal<Usuario[]> = computed(() => {
    const todos = this.usuariosOriginales();
    const termino = this.normalizarTexto(this.terminoBusqueda());

    if (!termino) return todos;

    return todos.filter(u => {
      const nombreCompleto = `${u.nombre} ${u.apellido}`;
      return this.normalizarTexto(nombreCompleto).includes(termino) ||
        this.normalizarTexto(u.email).includes(termino) ||
        this.normalizarTexto(u.rol).includes(termino) ||
        this.normalizarTexto(u.telefono || '').includes(termino);
    });
  });

  // Total de páginas (reactivo)
  totalPaginas = computed(() => {
    const total = this.filteredUsers().length;
    return Math.max(1, Math.ceil(total / this.usuariosPorPagina()));
  });

  // Array simple de páginas (1..N). NO hay lógica de "..." — lista completa.
  paginasDisponibles = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1)
  );

  // Usuarios para la página actual
  usuariosPaginados: Signal<Usuario[]> = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.usuariosPorPagina();
    const fin = inicio + this.usuariosPorPagina();
    return this.filteredUsers().slice(inicio, fin);
  });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  private cargarUsuarios(): void {
    this.isLoading.set(true);
    this.firestoreService.getCollection<Usuario>('usuarios').subscribe(
      data => {
        // Filtrar usuarios solo para mostrar roles permitidos
        const rolesPermitidos = [RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA, RolUsuario.EMPLEADO];
        const usuariosFiltrados = (data || []).filter(u => rolesPermitidos.includes(u.rol));

        this.usuariosOriginales.set(usuariosFiltrados);
        this.isLoading.set(false);
        this.paginaActual.set(1);
      },
      err => {
        console.error('Error cargando usuarios', err);
        this.isLoading.set(false);
      }
    );
  }

  // Eventos
  onBusquedaChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.terminoBusqueda.set(input.value);
    this.paginaActual.set(1); // volver a la primera página al buscar
  }

  irAPagina(numero: number): void {
    if (numero >= 1 && numero <= this.totalPaginas()) {
      this.paginaActual.set(numero);
    }
  }

  async eliminarUsuario(usuario: Usuario): Promise<void> {

    // const result = await Swal.fire({
    //   title: '¿Estás Seguro?',
    //   text: `Esta acción cambiará el estado del usuario ${usuario.nombre} ${usuario.apellido} a INACTIVO.`,
    //   icon: 'warning',
    //   showCancelButton: true,
    //   confirmButtonText: 'Sí, desactivar',
    //   cancelButtonText: 'Cancelar',
    //   confirmButtonColor: '#d33',
    //   cancelButtonColor: '#6c757d'
    // });

    // if (!result.isConfirmed) return;

    try {
      // Soft delete: cambiar estado a INACTIVO
      await this.firestoreService.updateDocument('usuarios', usuario.uid, { estado: EstadoUsuario.INACTIVO });

      // Actualizar lista local
      this.usuariosOriginales.update(usuarios =>
        usuarios.map(u => u.uid === usuario.uid ? { ...u, estado: EstadoUsuario.INACTIVO } : u)
      );

      console.log('Usuario desactivado correctamente');

      // Swal.fire({
      //   title: 'Desactivado',
      //   text: 'El usuario ha sido marcado como inactivo.',
      //   icon: 'success',
      //   timer: 2000,
      //   showConfirmButton: false
      // });
    } catch (error) {
      console.error('Error desactivando usuario', error);
      // Swal.fire('Error', 'No se pudo desactivar el usuario.', 'error');
    }
  }

  async activarUsuario(usuario: Usuario): Promise<void> {
    try {
      await this.firestoreService.updateDocument('usuarios', usuario.uid, { estado: EstadoUsuario.ACTIVO });

      this.usuariosOriginales.update(usuarios =>
        usuarios.map(u => u.uid === usuario.uid ? { ...u, estado: EstadoUsuario.ACTIVO } : u)
      );

      console.log('Usuario activado correctamente');
    } catch (error) {
      console.error('Error activando usuario', error);
    }
  }

}
