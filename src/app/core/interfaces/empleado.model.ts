
import { HorariosLaborales, Usuario } from "./usuario.model";


export interface Empleado extends Usuario {
    fechaIngreso: Date;
    horariosLaborales: HorariosLaborales;
}