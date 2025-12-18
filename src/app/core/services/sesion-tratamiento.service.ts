import { Injectable, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { SesionTratamiento } from '../interfaces/sesion-tratamiento.model';
import { Timestamp } from 'firebase/firestore';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SesionTratamientoService {
    private firestoreService = inject(FirestoreService);
    private collectionName = 'sesiones_tratamiento';

    /**
     * Crea un nuevo registro de sesión
     */
    async crearSesion(data: Partial<SesionTratamiento>): Promise<string> {
        const nuevaSesion: any = {
            ...data,
            fecha: data.fecha || Timestamp.now(),
            createdAt: Timestamp.now(),
            completada: true
        };

        // Convertir fechas a Timestamps
        if (data.proximaSesionProgramada && data.proximaSesionProgramada instanceof Date) {
            nuevaSesion.proximaSesionProgramada = Timestamp.fromDate(data.proximaSesionProgramada);
        }

        const docRef = await this.firestoreService.addDocument(this.collectionName, nuevaSesion);
        return docRef.id;
    }

    /**
     * Obtiene todas las sesiones de un tratamiento específico
     */
    getSesionesPorTratamiento(tratamientoPacienteId: string): Observable<SesionTratamiento[]> {
        return this.firestoreService.getCollectionByFilter<SesionTratamiento>(
            this.collectionName,
            'tratamientoPacienteId',
            tratamientoPacienteId
        ).pipe(
            map(items => items.map(item => this.mapTimestampToDate(item)))
        );
    }

    /**
     * Obtiene una sesión específica por ID
     */
    async getSesionById(id: string): Promise<SesionTratamiento | null> {
        const data = await this.firestoreService.getDocumentById<SesionTratamiento>(this.collectionName, id);
        return data ? this.mapTimestampToDate(data) : null;
    }

    /**
     * Actualiza una sesión existente
     */
    async actualizarSesion(id: string, data: Partial<SesionTratamiento>): Promise<void> {
        const dataToUpdate: any = { ...data };

        if (dataToUpdate.proximaSesionProgramada && dataToUpdate.proximaSesionProgramada instanceof Date) {
            dataToUpdate.proximaSesionProgramada = Timestamp.fromDate(dataToUpdate.proximaSesionProgramada);
        }

        await this.firestoreService.updateDocument(this.collectionName, id, dataToUpdate);
    }

    // Helper para convertir Timestamps de Firestore a Dates de JS
    private mapTimestampToDate(item: any): SesionTratamiento {
        const data = { ...item };
        if (data.fecha?.toDate) data.fecha = data.fecha.toDate();
        if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();
        if (data.proximaSesionProgramada?.toDate) data.proximaSesionProgramada = data.proximaSesionProgramada.toDate();
        return data;
    }
}
