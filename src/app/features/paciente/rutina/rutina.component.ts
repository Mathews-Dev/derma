import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { Paciente, ProductoSkincare } from '../../../core/interfaces/paciente.model';

@Component({
    selector: 'app-rutina',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './rutina.component.html',
    styleUrl: './rutina.component.css'
})
export class RutinaComponent {
    private authService = inject(AuthService);

    // Signals
    activeView = signal<'manana' | 'noche'>('manana');
    currentDate = signal(new Date());

    // Derived state
    currentUser = computed(() => this.authService.currentUser() as Paciente | undefined);

    rutinaManana = computed(() => this.currentUser()?.rutina?.manana || []);
    rutinaNoche = computed(() => this.currentUser()?.rutina?.noche || []);

    currentProducts = computed(() => {
        return this.activeView() === 'manana' ? this.rutinaManana() : this.rutinaNoche();
    });

    // Methods
    toggleView(view: 'manana' | 'noche') {
        this.activeView.set(view);
    }

    markAsDone(producto: ProductoSkincare) {
        // Phase 2: Implement Habit Tracking logic here
        console.log(`Producto ${producto.nombre} marcado como aplicado.`);
    }

    getProductIcon(tipo: string): string {
        const icons: Record<string, string> = {
            'limpiador': '💧',
            'tonico': '✨',
            'serum': '🧪',
            'crema': '🧴',
            'protector': '☀️',
            'contorno': '👁️',
            'otro': '🌸'
        };
        return icons[tipo] || '🌸';
    }
}
