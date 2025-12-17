import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'durationFormat',
    standalone: true
})
export class DurationFormatPipe implements PipeTransform {

    transform(minutes: number): string {
        if (!minutes) return '0 min';

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hours > 0) {
            return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
        } else {
            return `${mins} min`;
        }
    }

}
