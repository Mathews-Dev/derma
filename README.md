# Sistema para una Dermatologia Estética

Sistema para una Dermatologia Estética. 

## Tabla de Contenidos
- [Instalación](#instalación)
- [Comandos](#comandos)
- [Uso](#uso)
- [Contribuciones](#contribuciones)
- [Licencia](#licencia)

## Instalación

Instrucciones para instalar:
```bash
# Instalar los modulos de node
npm install
```

```bash
# Crear el proyecto
ng new derma --routing --style=css
```

# Configuración de la Conexión a Firebase:

Ejecutamos el siguiente comando para agregar firebase al proyecto

```bash
npm install firebase @angular/fire@19.2.0

```
Y luego agregamos el environment

```bash
ng g environments

```

## Comandos

Estructura del Proyecto y Comando

```bash
# Servicios
ng g s core/services/firestore --skip-tests
ng g s core/services/auth --skip-tests
ng g s core/services/invitacion --skip-tests
ng g s core/services/whatsapp --skip-tests

```bash
# Layout's
ng g c layout/navbar --skip-tests


```bash
# Guards
ng g guard core/guards/auth --skip-tests


```bash
# Interfaces
ng g i core/interfaces/usuario --type=model
ng g i core/interfaces/profesional --type=model
ng g i core/interfaces/empleado --type=model
ng g i core/interfaces/paciente --type=model
ng g i core/interfaces/solicitud-invitacion --type=model
 

# Layout's
ng g c layouts/public-layout --skip-tests
ng g c layouts/public-layout/components/home-navbar --skip-tests
ng g c layouts/public-layout/components/footer --skip-tests

ng g c layouts/shared-layout --skip-tests
ng g c layouts/paciente-layout --skip-tests


# Dashboards
ng g c dashboards/dashboard-admin --skip-tests
ng g c dashboards/dashboard-profesional --skip-tests
ng g c dashboards/dashboard-empleado --skip-tests
ng g c dashboards/dashboard-paciente --skip-tests

# Auth - Solo Login y 2 Register
ng g c features/auth/login/login --skip-tests
ng g c features/auth/register/register-paciente --skip-tests
ng g c features/auth/register/register-usuario-clinica --skip-tests

# Componentes Home
ng g c features/home/home --skip-tests

# Crear el componente Header
ng g c layouts/shared-layout/header --skip-tests

# Crear el componente Sidebar
ng g c layouts/shared-layout/sidebar --skip-tests

# Componentes Globales
ng g c shared/components/invitation-modal --skip-tests

# Componente Mi Perfil (para todos los roles excepto pacientes)
ng generate component features/profile/mi-perfil --skip-tests

# Módulo de Pacientes - Componentes
# Dashboard
ng generate component features/paciente/dashboard/dashboard-paciente --skip-tests

# Perfil
ng generate component features/paciente/perfil/mi-perfil-paciente --skip-tests
ng generate component features/paciente/perfil/editar-perfil-paciente --skip-tests

# Citas
ng generate component features/paciente/citas/mis-citas --skip-tests
ng generate component features/paciente/citas/agendar-cita --skip-tests
ng generate component features/paciente/citas/detalle-cita --skip-tests

# Tratamientos
ng generate component features/paciente/tratamientos/mis-tratamientos --skip-tests
ng generate component features/paciente/tratamientos/catalogo-tratamientos --skip-tests
ng generate component features/paciente/tratamientos/detalle-tratamiento --skip-tests

# Historial
ng generate component features/paciente/historial/historial-medico --skip-tests
ng generate component features/paciente/historial/fotos-progreso --skip-tests
ng generate component features/paciente/historial/resultados --skip-tests

# Notificaciones
ng generate component features/paciente/notificaciones/notificaciones-paciente --skip-tests



# Módulo Administración
ng g c features/administracion/gestion-usuarios --skip-tests
ng g c features/administracion/editar-usuario --skip-tests
ng g c features/administracion/configuracion --skip-tests

# Módulo Médico / Clínica
ng g c features/medica/gestion-pacientes --skip-tests
ng g c features/medica/gestion-profesionales --skip-tests
ng g c features/medica/gestion-tratamientos --skip-tests
ng g c features/medica/gestion-servicios --skip-tests

# Módulo Recepción
ng g c features/recepcion/gestion-turnos --skip-tests

# Módulo Operaciones
ng g c features/operaciones/gestion-insumos --skip-tests
ng g c features/operaciones/gestion-tareas --skip-tests

# Módulo Fotografía y Consentimiento
ng generate component shared/components/captura-foto --standalone --skip-tests
ng generate component shared/components/visor-fotos --standalone --skip-tests
ng generate component features/medica/consentimiento-form --standalone --skip-tests
ng generate component features/medica/sesion-tratamiento --standalone --skip-tests
ng generate component features/medica/programar-sesion-standalone --skip-tests
ng generate component features/captura-foto-mobile --skip-tests

# Servicios Fotografía y Consentimiento
ng generate service core/services/foto-progreso --skip-tests
ng generate service core/services/consentimiento --skip-tests
ng generate service core/services/sesion-tratamiento --skip-tests

# Instalación QR Code (Fase 3)
npm install angularx-qrcode --force

# Instalación Driver.js para tours interactivos
npm install driver.js

# Instalacion y configuración de Tailwind
npm install tailwindcss @tailwindcss/postcss postcss --force

# Crear el archivo .postcssrc.js en el root del proyecto
# Pegar el siguiente codigo
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}

#Importar Tailwind en el archivo styles.css
@import "tailwindcss";


```bash
```
Instalar preline para el uso de componentes reutilizables en Tailwind
```
npm i preline
npm install -D @tailwindcss/forms

# Incluir Preline en tu archivo styles.css

@import "tailwindcss";

@import "preline/variants.css";
@source "../node_modules/preline/dist/*.js";

```
Crea este archivo en la carpeta raiz de tu proyecto src `global.d.ts` ruta: `projects_root_directory/src/global.d.ts`
Pega el siguiente texto
```
import type { IStaticMethods } from "preline/dist";

declare global {
  interface Window {
    // Optional third-party libraries
    _;
    $: typeof import("jquery");
    jQuery: typeof import("jquery");
    DataTable;
    Dropzone;
    VanillaCalendarPro;

    // Preline UI
    HSStaticMethods: IStaticMethods;
  }
}

export {};

# Agrega el JS de Preline en tu `projects_root_directory/angular.json`

# // Optional third-party libraries
"node_modules/jquery/dist/jquery.min.js",
"node_modules/lodash/lodash.min.js",
"node_modules/dropzone/dist/dropzone-min.js",
"node_modules/nouislider/dist/nouislider.min.js",
"node_modules/datatables.net/js/dataTables.min.js",
"node_modules/vanilla-calendar-pro/index.js",

# // Preline UI
"node_modules/preline/dist/index.js"
```
Agrega código que reinicialice los componentes cada vez que se actualice la página en la aplicación `projects_root_directory/src/app/app.component.ts`
```
import { Router, Event, NavigationEnd } from '@angular/router';

@Component({
  ...
})

export class AppComponent {
  constructor(private router: Router) {
    ...
  }

  ngOnInit() {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        setTimeout(() => window.HSStaticMethods.autoInit(), 100);
      }
    });
  }
}
```
**Nota:** Para mas informacion de como instalar Preline.co para Angular 
          Te recomiendo que visites esta pagina
          [Preline With Angular](https://preline.co/docs/frameworks-angular.html)
```
