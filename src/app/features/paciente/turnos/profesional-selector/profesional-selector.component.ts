import { Component, OnInit, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { Profesional } from '../../../../core/interfaces/profesional.model';
import { RolUsuario, EstadoUsuario } from '../../../../core/interfaces/usuario.model';

@Component({
  selector: 'app-profesional-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profesional-selector.component.html',
  styleUrl: './profesional-selector.component.css'
})
export class ProfesionalSelectorComponent implements OnInit {
  private firestoreService = inject(FirestoreService);

  @Output() profesionalSeleccionado = new EventEmitter<Profesional>();

  profesionales = signal<Profesional[]>([]);
  profesionalesFiltrados = signal<Profesional[]>([]);
  isLoading = signal<boolean>(true);
  filtroTitulo = signal<string>('');

  ngOnInit(): void {
    this.cargarProfesionales();
  }

  async cargarProfesionales(): Promise<void> {
    this.isLoading.set(true);

    try {
      console.log('Cargando profesionales...');
      // Obtener todos los usuarios con rol dermatologo y estado activo
      const usuarios$ = this.firestoreService.getCollectionByFilter<Profesional>(
        'usuarios',
        'rol',
        RolUsuario.DERMATOLOGO
      );

      const usuarios = await firstValueFrom(usuarios$);
      console.log('Usuarios encontrados (raw):', usuarios);

      const profesionalesActivos = (usuarios || []).filter(
        u => u.estado === EstadoUsuario.ACTIVO
      );
      console.log('Profesionales activos filtrados:', profesionalesActivos);

      this.profesionales.set(profesionalesActivos);
      this.profesionalesFiltrados.set(profesionalesActivos);
    } catch (error) {
      console.error('Error al cargar profesionales:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  filtrarPorTitulo(titulo: string): void {
    this.filtroTitulo.set(titulo);

    if (!titulo) {
      this.profesionalesFiltrados.set(this.profesionales());
      return;
    }

    const filtrados = this.profesionales().filter(p =>
      p.tituloProfesional?.toLowerCase().includes(titulo.toLowerCase())
    );

    this.profesionalesFiltrados.set(filtrados);
  }

  seleccionar(profesional: Profesional): void {
    this.profesionalSeleccionado.emit(profesional);
  }

  // Obtener títulos únicos para filtros
  getTitulosUnicos(): string[] {
    const titulos = this.profesionales()
      .map(p => p.tituloProfesional)
      .filter((t): t is string => !!t);

    return [...new Set(titulos)];
  }
}
