import { Injectable, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { FotoProgreso } from '../interfaces/historial-medico.model';
import { Observable } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FotoProgresoService {
  private firestoreService = inject(FirestoreService);

  constructor() { }

  async guardarFoto(foto: FotoProgreso): Promise<string> {
    // Si la imagen es muy grande, comprimirla (opcional, aunque idealmente debería hacerse antes)
    // Aquí asumimos que ya viene en base64.

    // Asegurar que fecha sea Timestamp si no lo es
    if (!(foto.fecha instanceof Timestamp)) {
      // @ts-ignore
      foto.fecha = Timestamp.fromDate(new Date(foto.fecha));
    }

    // Guardar en Firestore
    await this.firestoreService.addDocument('fotos-progreso', foto);
    return foto.id;
  }

  obtenerFotosPaciente(pacienteId: string): Observable<FotoProgreso[]> {
    return this.firestoreService.getCollectionByFilter<FotoProgreso>('fotos-progreso', 'pacienteId', pacienteId);
  }

  obtenerFotosTratamiento(tratamientoId: string): Observable<FotoProgreso[]> {
    return this.firestoreService.getCollectionByFilter<FotoProgreso>('fotos-progreso', 'tratamientoId', tratamientoId);
  }

  // Utilidad para comprimir base64 (cliente-side)
  comprimirImagen(base64: string, maxWidth = 1024, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('No se pudo obtener contexto 2D');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = error => reject(error);
    });
  }
}
