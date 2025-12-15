import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvitacionService } from '../../../core/services/invitacion.service';

@Component({
    selector: 'app-invitation-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './invitation-modal.component.html'
})
export class InvitationModalComponent {
    @Output() close = new EventEmitter<void>();

    private _invitacionService = inject(InvitacionService);

    roles = [
        { value: 'admin', label: 'Admin' },
        { value: 'dermatologo', label: 'Dermatólogo' },
        { value: 'recepcionista', label: 'Recepcionista' },
        { value: 'empleado', label: 'Empleado' }
    ];

    selectedRole: any = 'dermatologo'; // Default
    generatedLink: string = '';
    isGenerating = false;
    isCopied = false;

    async generateLink() {
        this.isGenerating = true;
        try {
            this.generatedLink = await this._invitacionService.generarInvitacion(this.selectedRole);
        } catch (error) {
            console.error('Error generando invitación:', error);
        } finally {
            this.isGenerating = false;
        }
    }

    copyLink() {
        if (!this.generatedLink) return;
        navigator.clipboard.writeText(this.generatedLink).then(() => {
            this.isCopied = true;
            setTimeout(() => this.isCopied = false, 2000);
        });
    }

    closeModal() {
        this.close.emit();
    }
}
