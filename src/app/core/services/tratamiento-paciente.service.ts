import { Injectable, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { TratamientoPaciente } from '../interfaces/tratamiento.model';
import { Timestamp } from 'firebase/firestore';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TratamientoPacienteService {
  private firestoreService = inject(FirestoreService);
  private collectionName = 'tratamientos_pacientes';

  /**
   * Asigna un nuevo tratamiento a un paciente (Lo crea en DB).
   * Estado inicial por defecto: 'programado'
   */
  async crearTratamientoPaciente(data: Partial<TratamientoPaciente>): Promise<string> {
    const nuevoTratamiento: any = {
      ...data,
      fechaInicio: data.fechaInicio || Timestamp.now(), // Si no viene fecha, usa ahora
      estado: data.estado || 'programado',
      sesionesRealizadas: 0,
      progreso: 0,
      fechaCreacion: Timestamp.now()
    };
    
    // Asegurarse de que las fechas sean Timestamps si vienen como Date
    if (data.fechaFinEstimada && data.fechaFinEstimada instanceof Date) {
        nuevoTratamiento.fechaFinEstimada = Timestamp.fromDate(data.fechaFinEstimada);
    }

    const docRef = await this.firestoreService.addDocument(this.collectionName, nuevoTratamiento);
    return docRef.id;
  }

  /**
   * Obtiene todos los tratamientos de un paciente específico.
   */
  getTratamientosPorPaciente(pacienteId: string): Observable<TratamientoPaciente[]> {
    return this.firestoreService.getCollectionByFilter<TratamientoPaciente>(
      this.collectionName, 
      'pacienteId', 
      pacienteId
    ).pipe(
      map(items => items.map(item => this.mapTimestampToDate(item)))
    );
  }

  /**
   * Obtiene solo los tratamientos activos (en_curso o programado)
   */
  getActiveTreatments(pacienteId: string): Observable<TratamientoPaciente[]> {
    return this.getTratamientosPorPaciente(pacienteId).pipe(
      map(tratamientos => tratamientos.filter(t => 
        t.estado === 'en_curso' || t.estado === 'programado'
      ))
    );
  }

  /**
   * Actualiza el progreso o estado de un tratamiento
   */
  async actualizarTratamiento(id: string, data: Partial<TratamientoPaciente>): Promise<void> {
    const dataToUpdate: any = { ...data };
    
    if (dataToUpdate.proximaSesion && dataToUpdate.proximaSesion instanceof Date) {
        dataToUpdate.proximaSesion = Timestamp.fromDate(dataToUpdate.proximaSesion);
    }

    await this.firestoreService.updateDocument(this.collectionName, id, dataToUpdate);
  }

  // Helper para convertir Timestamps de Firestore a Dates de JS
  private mapTimestampToDate(item: any): TratamientoPaciente {
    const data = { ...item };
    if (data.fechaInicio?.toDate) data.fechaInicio = data.fechaInicio.toDate();
    if (data.fechaFinEstimada?.toDate) data.fechaFinEstimada = data.fechaFinEstimada.toDate();
    if (data.proximaSesion?.toDate) data.proximaSesion = data.proximaSesion.toDate();
    return data;
  }
}
