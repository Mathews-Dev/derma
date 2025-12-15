import { Injectable } from '@angular/core';
import gsap from 'gsap';

@Injectable({
    providedIn: 'root'
})
export class GsapAnimationService {

    constructor() { }

    /**
     * Animates a clip-path overlay to expand from the mouse position.
     * @param event The MouseEvent triggering the hover.
     * @param element The overlay element to animate (must have absolute positioning and clip-path style).
     * @param duration Duration of the expansion (default 1.1s).
     * @param ease Easing function (default 'power4.out').
     */
    hoverFill(event: MouseEvent, element: HTMLElement, duration: number = 2.5, ease: string = 'power4.out') {
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Use a slightly larger multiplier to ensure corners are covered
        const size = Math.sqrt(Math.pow(rect.width, 2) + Math.pow(rect.height, 2)) * 1.5;

        // Kill any active animations
        gsap.killTweensOf(element);

        // Set initial position of the clip-path circle center
        gsap.set(element, {
            clipPath: `circle(0px at ${x}px ${y}px)`
        });

        // Animate expansion
        gsap.to(element, {
            clipPath: `circle(${size}px at ${x}px ${y}px)`,
            duration: duration,
            ease: ease
        });
    }

    /**
     * Animates a clip-path overlay to contract to the mouse exit position.
     * @param event The MouseEvent triggering the leave.
     * @param element The overlay element.
     * @param duration Duration of the contraction (default 1.1s).
     * @param ease Easing function (default 'power4.out').
     */
    leaveFill(event: MouseEvent, element: HTMLElement, duration: number = 1.6, ease: string = 'power4.out') {
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Kill active animations
        gsap.killTweensOf(element);

        // Animate contraction to exit point
        gsap.to(element, {
            clipPath: `circle(0px at ${x}px ${y}px)`,
            duration: duration,
            ease: ease
        });
    }
}
