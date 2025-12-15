import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { Paciente } from '../../../core/interfaces/paciente.model';

@Component({
    selector: 'app-documentos',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './documentos.component.html',
    styleUrl: './documentos.component.css'
})
export class DocumentosComponent {
    private authService = inject(AuthService);

    // Derived state
    currentUser = computed(() => this.authService.currentUser() as Paciente | undefined);

    consentimientos = computed(() => this.currentUser()?.consentimientos || []);

    // For demo purposes, if empty, we might show a placeholder strictly for UI dev?
    // Or just rely on the empty state.

    downloadDoc(url: string) {
        window.open(url, '_blank');
    }
}
