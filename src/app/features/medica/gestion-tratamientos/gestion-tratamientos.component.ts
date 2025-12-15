import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Tratamiento } from '../../../core/interfaces/tratamiento.model';

@Component({
  selector: 'app-gestion-tratamientos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gestion-tratamientos.component.html',
  styleUrl: './gestion-tratamientos.component.css'
})
export class GestionTratamientosComponent implements OnInit {

  private firestoreService = inject(FirestoreService);

  // Datos y estado
  tratamientosOriginales: WritableSignal<Tratamiento[]> = signal([]);
  isLoading = signal(true);

  // Búsqueda y paginación
  terminoBusqueda = signal('');
  paginaActual = signal(1);
  usuariosPorPagina = signal(6);

  // Normalizar texto (para búsquedas)
  private normalizarTexto(texto?: string): string {
    if (!texto) return '';
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Helper para mostrar duración amigable
  formatoDuracion(minutos: number): string {
    if (!minutos) return '-';
    if (minutos < 60) return `${minutos} m`;

    const horas = Math.floor(minutos / 60);
    const minRestantes = minutos % 60;

    return minRestantes > 0
      ? `${horas} h ${minRestantes} m`
      : `${horas} h`;
  }

  // Filtrado por término de búsqueda
  filteredTratamientos: Signal<Tratamiento[]> = computed(() => {
    const todos = this.tratamientosOriginales();
    const termino = this.normalizarTexto(this.terminoBusqueda());

    if (!termino) return todos;

    return todos.filter(t => {
      return this.normalizarTexto(t.nombre).includes(termino) ||
        this.normalizarTexto(t.categoria).includes(termino);
    });
  });

  // Total de páginas (reactivo)
  totalPaginas = computed(() => {
    const total = this.filteredTratamientos().length;
    return Math.max(1, Math.ceil(total / this.usuariosPorPagina()));
  });

  // Array simple de páginas
  paginasDisponibles = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1)
  );

  // Tratamientos para la página actual
  tratamientosPaginados: Signal<Tratamiento[]> = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.usuariosPorPagina();
    const fin = inicio + this.usuariosPorPagina();
    return this.filteredTratamientos().slice(inicio, fin);
  });

  ngOnInit(): void {
    this.cargarTratamientos();
  }

  private cargarTratamientos(): void {
    this.isLoading.set(true);
    this.firestoreService.getCollection<Tratamiento>('tratamientos').subscribe(
      data => {
        // Ordenar por 'orden' si existe, o por nombre
        const ordenados = (data || []).sort((a, b) => (a.orden || 99) - (b.orden || 99));
        this.tratamientosOriginales.set(ordenados);
        this.isLoading.set(false);
        this.paginaActual.set(1);
      },
      err => {
        console.error('Error cargando tratamientos', err);
        this.isLoading.set(false);
      }
    );
  }

  // Eventos
  onBusquedaChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.terminoBusqueda.set(input.value);
    this.paginaActual.set(1);
  }

  irAPagina(numero: number): void {
    if (numero >= 1 && numero <= this.totalPaginas()) {
      this.paginaActual.set(numero);
    }
  }

  async toggleEstadoTratamiento(tratamiento: Tratamiento): Promise<void> {
    const nuevoEstado = !tratamiento.activo;
    try {
      await this.firestoreService.updateDocument('tratamientos', tratamiento.id, { activo: nuevoEstado });

      // Actualización optimista local
      this.tratamientosOriginales.update(lista =>
        lista.map(t => t.id === tratamiento.id ? { ...t, activo: nuevoEstado } : t)
      );

      console.log(`Tratamiento ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
    } catch (error) {
      console.error('Error cambiando estado del tratamiento', error);
    }
  }
}

