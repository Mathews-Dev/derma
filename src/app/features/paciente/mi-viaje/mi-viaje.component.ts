import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface TimelineEvent {
    date: Date;
    title: string;
    type: 'tratamiento' | 'consulta' | 'producto';
    description?: string;
    imageUrl?: string;
    beforeAfter?: { before: string; after: string };
}

@Component({
    selector: 'app-mi-viaje',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './mi-viaje.component.html',
    styleUrl: './mi-viaje.component.css'
})
export class MiViajeComponent {
    private authService = inject(AuthService);

    // Mock Data for Visualization (Replace with real data later)
    events = signal<TimelineEvent[]>([
        {
            date: new Date('2024-11-15'),
            title: 'Toxina Botulínica (Botox)',
            type: 'tratamiento',
            description: 'Aplicación en tercio superior: frente, entrecejo y patas de gallo.',
            beforeAfter: {
                before: 'assets/images/placeholder-face.jpg', // Placeholder
                after: 'assets/images/placeholder-face.jpg'
            }
        },
        {
            date: new Date('2024-10-01'),
            title: 'Consulta de Valoración',
            type: 'consulta',
            description: 'Diagnóstico de fototipo y biotipo. Planificación de rutina.'
        },
        {
            date: new Date('2024-10-01'),
            title: 'Inicio Rutina Skincare',
            type: 'producto',
            description: 'Lanzamiento de rutina despigmentante nocturna.'
        }
    ]);

    getDaysAgo(date: Date): number {
        const diff = new Date().getTime() - date.getTime();
        return Math.floor(diff / (1000 * 3600 * 24));
    }
}
