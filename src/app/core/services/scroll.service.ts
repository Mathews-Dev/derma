import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ScrollService {
    private scrollContainerSubject = new BehaviorSubject<HTMLElement | null>(null);
    scrollContainer$ = this.scrollContainerSubject.asObservable();

    setScrollContainer(element: HTMLElement) {
        this.scrollContainerSubject.next(element);
    }
}
