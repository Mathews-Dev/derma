import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CapturaFotoComponent } from '../../shared/components/captura-foto/captura-foto.component';
import { FirestoreService } from '../../core/services/firestore.service';

@Component({
  selector: 'app-captura-foto-mobile',
  standalone: true,
  imports: [CommonModule, CapturaFotoComponent],
  templateUrl: './captura-foto-mobile.component.html',
  styleUrl: './captura-foto-mobile.component.css'
})
export class CapturaFotoMobileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private firestoreService = inject(FirestoreService);

  sessionId = signal<string>('');
  tipo = signal<'antes' | 'despues'>('antes');
  fotoCapturada = signal<string | null>(null);
  enviando = signal<boolean>(false);

  ngOnInit() {
    this.sessionId.set(this.route.snapshot.paramMap.get('sessionId')!);
    this.tipo.set(this.route.snapshot.paramMap.get('tipo') as any);
  }

  onFotoCapturada(base64: string) {
    this.fotoCapturada.set(base64);
  }

  async confirmarFoto() {
    this.enviando.set(true);

    try {
      await this.firestoreService.addDocument('fotos_temp', {
        sessionId: this.sessionId(),
        tipo: this.tipo(),
        imagenUrl: this.fotoCapturada(),
        timestamp: new Date()
      });

      alert('✅ Foto enviada exitosamente');
      this.fotoCapturada.set(null);
    } catch (error) {
      console.error('Error al enviar foto:', error);
      alert('❌ Error al enviar la foto');
    } finally {
      this.enviando.set(false);
    }
  }
}
