import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorariosLaborales, FranjaHoraria } from '../../../core/interfaces/usuario.model';

interface DaySchedule {
    key: keyof HorariosLaborales;
    label: string; // 'Lunes', 'Martes', etc.
    shortLabel: string; // 'Lun', 'Mar'
    isActive: boolean;
    franjas: FranjaHoraria[];
}

@Component({
    selector: 'app-schedule-selector',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './schedule-selector.component.html'
})
export class ScheduleSelectorComponent implements OnInit {
    @Input() set initialSchedule(value: HorariosLaborales | null) {
        if (value) {
            this.resetDays();
            this.loadSchedule(value);
        }
    }

    @Output() scheduleChange = new EventEmitter<HorariosLaborales>();

    isOpen = signal(false);
    hasSchedule = signal(false);

    // Track selected day for configuration panel
    selectedDayKey = signal<string>('lunes');

    days = signal<DaySchedule[]>([
        { key: 'lunes', label: 'Lunes', shortLabel: 'Lun', isActive: false, franjas: [] },
        { key: 'martes', label: 'Martes', shortLabel: 'Mar', isActive: false, franjas: [] },
        { key: 'miercoles', label: 'Miércoles', shortLabel: 'Mié', isActive: false, franjas: [] },
        { key: 'jueves', label: 'Jueves', shortLabel: 'Jue', isActive: false, franjas: [] },
        { key: 'viernes', label: 'Viernes', shortLabel: 'Vie', isActive: false, franjas: [] },
        { key: 'sabado', label: 'Sábado', shortLabel: 'Sáb', isActive: false, franjas: [] },
        { key: 'domingo', label: 'Domingo', shortLabel: 'Dom', isActive: false, franjas: [] },
    ]);

    ngOnInit() {
        // Initialization handled by signal default and input setter
    }

    private resetDays() {
        this.days.set([
            { key: 'lunes', label: 'Lunes', shortLabel: 'Lun', isActive: false, franjas: [] },
            { key: 'martes', label: 'Martes', shortLabel: 'Mar', isActive: false, franjas: [] },
            { key: 'miercoles', label: 'Miércoles', shortLabel: 'Mié', isActive: false, franjas: [] },
            { key: 'jueves', label: 'Jueves', shortLabel: 'Jue', isActive: false, franjas: [] },
            { key: 'viernes', label: 'Viernes', shortLabel: 'Vie', isActive: false, franjas: [] },
            { key: 'sabado', label: 'Sábado', shortLabel: 'Sáb', isActive: false, franjas: [] },
            { key: 'domingo', label: 'Domingo', shortLabel: 'Dom', isActive: false, franjas: [] },
        ]);
    }

    openModal() { this.isOpen.set(true); }
    closeModal() { this.isOpen.set(false); }

    selectDay(key: string) {
        this.selectedDayKey.set(key);
    }

    get selectedDay(): DaySchedule {
        return this.days().find(d => d.key === this.selectedDayKey())!;
    }

    toggleDayActive(day: DaySchedule) {
        // Direct update to mutable object in signal array (easier reference)
        // or immutable way:
        this.days.update(currentDays => {
            const d = currentDays.find(x => x.key === day.key);
            if (d) {
                d.isActive = !d.isActive;
                if (d.isActive && d.franjas.length === 0) {
                    d.franjas.push({ horaInicio: '09:00', horaFin: '17:00' });
                }
            }
            return [...currentDays];
        });
    }

    addFranjaToSelected() {
        const currentKey = this.selectedDayKey();
        this.days.update(currentDays => {
            const d = currentDays.find(x => x.key === currentKey);
            if (d) {
                d.franjas.push({ horaInicio: '09:00', horaFin: '17:00' });
            }
            return [...currentDays];
        });
    }

    removeFranjaFromSelected(index: number) {
        const currentKey = this.selectedDayKey();
        this.days.update(currentDays => {
            const d = currentDays.find(x => x.key === currentKey);
            if (d) {
                d.franjas.splice(index, 1);
            }
            return [...currentDays];
        });
    }

    saveSchedule() {
        const schedule: HorariosLaborales = {};
        let hasEntries = false;

        this.days().forEach(day => {
            if (day.isActive && day.franjas.length > 0) {
                schedule[day.key] = day.franjas;
                hasEntries = true;
            }
        });

        this.hasSchedule.set(hasEntries);
        this.scheduleChange.emit(schedule);
        this.isOpen.set(false);
    }

    private loadSchedule(schedule: HorariosLaborales) {
        console.log('ScheduleSelector: Loading schedule...', schedule);
        this.days.update(currentDays => {
            currentDays.forEach(day => {
                const franjas = schedule[day.key];
                console.log(`Checking day ${day.key}:`, franjas);
                if (franjas && franjas.length > 0) {
                    day.isActive = true;
                    day.franjas = JSON.parse(JSON.stringify(franjas));
                    console.log(`Day ${day.key} ACTIVATED with ${franjas.length} franjas`);
                }
            });
            return [...currentDays];
        });
        console.log('ScheduleSelector: Days updated:', this.days());
        this.hasSchedule.set(Object.keys(schedule).length > 0);
    }
}
