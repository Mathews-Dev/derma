import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent implements AfterViewInit {
  @ViewChild('footerContainer') footerContainer!: ElementRef<HTMLElement>;

  private resizeObserver: ResizeObserver | undefined;

  ngAfterViewInit() {
    this.setupResizeObserver();
  }

  private setupResizeObserver() {
    if (!this.footerContainer) return;

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        document.documentElement.style.setProperty('--footer-height', `${height}px`);
      }
    });

    this.resizeObserver.observe(this.footerContainer.nativeElement);
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}