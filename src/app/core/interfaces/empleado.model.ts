import { HorariosLaborales } from "./profesional.model";
import { Usuario } from "./usuario.model";


export interface Empleado extends Usuario {
    fechaIngreso: Date;
    horariosLaborales: HorariosLaborales;
}