import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentosProfesional } from '../../../core/interfaces/usuario.model';

@Component({
    selector: 'app-professional-docs',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './professional-docs.component.html'
})
export class ProfessionalDocsComponent {
    @Input() documents: DocumentosProfesional | undefined | null = {};
    @Input() editable: boolean = false;
    @Output() documentsChange = new EventEmitter<DocumentosProfesional>();

    viewingImage: WritableSignal<string | null> = signal(null);

    docTypes: (keyof DocumentosProfesional)[] = ['dniFrente', 'dniReverso', 'matriculaNacional', 'matriculaProvincial', 'diploma'];

    getLabel(key: string): string {
        switch (key) {
            case 'dniFrente': return 'DNI Frente';
            case 'dniReverso': return 'DNI Reverso';
            case 'matriculaNacional': return 'M. Nacional';
            case 'matriculaProvincial': return 'M. Provincial';
            case 'diploma': return 'Diploma';
            default: return key;
        }
    }

    // --- ACTIONS ---

    onFileSelected(event: Event, key: keyof DocumentosProfesional) {
        if (!this.editable) return;

        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            this.readFile(file).then(base64 => {
                this.updateDocument(key, base64);
            });
        }
    }

    removeDocument(key: keyof DocumentosProfesional) {
        if (!this.editable) return;
        this.updateDocument(key, undefined);
        // sending undefined or null to clear it. In firestore undefined usually ignores, but here we want to clear.
        // If interface allows null or string? Interface says `string | undefined`.
        // We might need to handle the specific logic of the parent form. 
        // Usually emitting a new object with the key set to null/undefined is enough.
    }

    private updateDocument(key: keyof DocumentosProfesional, value: string | undefined) {
        const newDocs = { ...this.documents, [key]: value };
        // Clean up undefined/null values if needed, but keeping them is fine for the form patch
        this.documents = newDocs; // Optimistic update
        this.documentsChange.emit(newDocs);
    }

    // --- VIEWER ---

    openLightbox(base64: string | undefined) {
        if (base64) {
            this.viewingImage.set(base64);
        }
    }

    closeLightbox() {
        this.viewingImage.set(null);
    }

    downloadImage() {
        const base64 = this.viewingImage();
        if (!base64) return;

        const link = document.createElement('a');
        link.href = base64;
        link.download = `documento_${new Date().getTime()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private readFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}
