import { Injectable, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { Consentimiento } from '../interfaces/paciente.model';
import { Observable } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ConsentimientoService {
  private firestoreService = inject(FirestoreService);

  constructor() { }

  async guardarConsentimiento(consentimiento: Consentimiento): Promise<string> {
    // Asegurar fecha Timestamp
    if (!(consentimiento.fechaFirma instanceof Timestamp)) {
      // @ts-ignore - Firestore maneja Timestamps
      consentimiento.fechaFirma = Timestamp.fromDate(new Date(consentimiento.fechaFirma));
    }

    await this.firestoreService.addDocument('consentimientos', consentimiento);
    return consentimiento.id;
  }

  obtenerConsentimientosPaciente(pacienteId: string): Observable<Consentimiento[]> {
    return this.firestoreService.getCollectionByFilter<Consentimiento>('consentimientos', 'pacienteId', pacienteId);
  }

  // Nota: La interfaz actual de Consentimiento en paciente.model.ts no tiene pacienteId explícito 
  // pero el plan de implementación sugiere que se guarde en una colección 'consentimientos'.
  // Vamos a asumir que extenderemos la interfaz o que el objeto que guardamos lo tendrá.
  // Por ahora seguimos la interfaz definida.
}
