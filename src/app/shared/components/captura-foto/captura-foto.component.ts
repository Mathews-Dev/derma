import { Component, ElementRef, EventEmitter, Output, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-captura-foto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './captura-foto.component.html',
  styleUrl: './captura-foto.component.css'
})
export class CapturaFotoComponent implements OnDestroy {
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  @Output() fotoCapturada = new EventEmitter<string>();

  stream: MediaStream | null = null;
  error: string = '';

  async iniciarCamara() {
    this.error = '';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      this.video.nativeElement.srcObject = this.stream;
    } catch (err: any) {
      console.error('Error al acceder a la cámara:', err);
      if (err.name === 'NotAllowedError') {
        this.error = 'Permiso denegado. Por favor permite el acceso a la cámara.';
      } else if (err.name === 'NotFoundError') {
        this.error = 'No se encontró ninguna cámara en el dispositivo.';
      } else {
        this.error = 'Error al iniciar la cámara: ' + err.message;
      }
    }
  }

  tomarFoto() {
    if (!this.stream) return;

    const video = this.video.nativeElement;
    const canvas = this.canvas.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        this.fotoCapturada.emit(base64);
        this.detenerCamara();
      } catch (e) {
        console.error('Error al procesar la imagen:', e);
        this.error = 'Error al procesar la imagen.';
      }
    }
  }

  detenerCamara() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      if (this.video?.nativeElement) {
        this.video.nativeElement.srcObject = null;
      }
    }
  }

  ngOnDestroy() {
    this.detenerCamara();
  }
}

