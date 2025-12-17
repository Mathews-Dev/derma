import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { PrivateLayoutComponent } from './layouts/private-layout/private-layout.component';
import { PacienteLayoutComponent } from './layouts/paciente-layout/paciente-layout.component';

export const routes: Routes = [

    // ============================================
    // RUTA DEFAULT
    // ============================================
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },


    // ============================================
    // RUTAS PÚBLICAS (sin autenticación)
    // ============================================
    {
        path: '',
        component: PublicLayoutComponent,
        // canActivate: [publicGuard],
        children: [

            {
                path: 'home',
                loadComponent: () => import('./features/home/home/home.component')
                    .then(m => m.HomeComponent)
            },
            // LOGIN - Un solo login para todos
            {
                path: 'login',
                loadComponent: () => import('./features/auth/login/login/login.component')
                    .then(m => m.LoginComponent)
            },

            // REGISTER - Paciente
            {
                path: 'register/paciente',
                loadComponent: () => import('./features/auth/register/register-paciente/register-paciente.component')
                    .then(m => m.RegisterPacienteComponent)
            },


            // REGISTER - Usuario Clínica (con invitación)
            {
                path: 'invite/:codigo',
                loadComponent: () => import('./features/auth/register/register-usuario-clinica/register-usuario-clinica.component')
                    .then(m => m.RegisterUsuarioClinicaComponent)
            }
            // Otros (comentados por ahora)
            // {
            //   path: 'verificar-email',
            //   loadComponent: () => import('./features/auth/verificar-email/verificar-email.component')
            //     .then(m => m.VerificarEmailComponent)
            // },
            // {
            //   path: 'reset-password',
            //   loadComponent: () => import('./features/auth/forgot-password/forgot-password.component')
            //     .then(m => m.ForgotPasswordComponent)
            // },
        ]
    },

    // ============================================
    // RUTAS PRIVADAS - ADMIN
    // ============================================
    {
        path: 'admin',
        component: PrivateLayoutComponent,
        // canActivate: [authGuard, adminGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./layouts/shared-layout/shared-layout.component')
                    .then(m => m.SharedLayoutComponent)
            },
            {
                path: 'mi-perfil',
                loadComponent: () => import('./features/profile/mi-perfil/mi-perfil.component')
                    .then(m => m.MiPerfilComponent)
            },
            // --- ADMINISTRACIÓN ---
            {
                path: 'gestion-usuarios',
                loadComponent: () => import('./features/administracion/gestion-usuarios/gestion-usuarios.component').then(m => m.GestionUsuariosComponent)
            },
            {
                path: 'gestion-usuarios/editar-usuario/:id',
                loadComponent: () => import('./features/administracion/editar-usuario/editar-usuario.component').then(m => m.EditarUsuarioComponent)
            },
            {
                path: 'configuracion',
                loadComponent: () => import('./features/administracion/configuracion/configuracion.component').then(m => m.ConfiguracionComponent)
            },

            // --- MÉDICA / CLÍNICA ---
            {
                path: 'gestion-pacientes',
                loadComponent: () => import('./features/medica/gestion-pacientes/gestion-pacientes.component').then(m => m.GestionPacientesComponent)
            },
            {
                path: 'gestion-profesionales',
                loadComponent: () => import('./features/medica/gestion-profesionales/gestion-profesionales.component').then(m => m.GestionProfesionalesComponent)
            },
            {
                path: 'gestion-profesionales/editar-profesional/:id',
                loadComponent: () => import('./features/medica/editar-profesional/editar-profesional.component').then(m => m.EditarProfesionalComponent)
            },
            {
                path: 'gestion-tratamientos',
                loadComponent: () => import('./features/medica/gestion-tratamientos/gestion-tratamientos.component').then(m => m.GestionTratamientosComponent)
            },
            {
                path: 'gestion-tratamientos/form-tratamiento',
                loadComponent: () => import('./features/medica/form-tratamiento/form-tratamiento.component').then(m => m.FormTratamientoComponent)
            },
            {
                path: 'gestion-tratamientos/form-tratamiento/:id',
                loadComponent: () => import('./features/medica/form-tratamiento/form-tratamiento.component').then(m => m.FormTratamientoComponent)
            },
            {
                path: 'gestion-servicios',
                loadComponent: () => import('./features/medica/gestion-servicios/gestion-servicios.component').then(m => m.GestionServiciosComponent)
            },

            // --- OPERACIONES ---
            {
                path: 'gestion-insumos',
                loadComponent: () => import('./features/operaciones/gestion-insumos/gestion-insumos.component').then(m => m.GestionInsumosComponent)
            },
            {
                path: 'gestion-tareas',
                loadComponent: () => import('./features/operaciones/gestion-tareas/gestion-tareas.component').then(m => m.GestionTareasComponent)
            },
            // --- RECEPCIÓN (también accesible desde admin) ---
            {
                path: 'gestion-turnos',
                loadComponent: () => import('./features/recepcion/gestion-turnos/gestion-turnos.component').then(m => m.GestionTurnosComponent)
            }
        ]
    },

    // ============================================
    // RUTAS PRIVADAS - MEDICA (DERMATOLOGO)
    // ============================================
    {
        path: 'medica',
        component: PrivateLayoutComponent,
        children: [
            {
                path: 'agenda',
                loadComponent: () => import('./features/medica/agenda-medica/agenda-medica.component').then(m => m.AgendaMedicaComponent)
            },
        ]
    },
    // ============================================
    // RUTAS PRIVADAS - RECEPCIONISTA
    // ============================================
    {
        path: 'recepcion',
        component: PrivateLayoutComponent,
        // canActivate: [authGuard, recepcionistaGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'turnos'
            },
            {
                path: 'turnos',
                loadComponent: () => import('./features/recepcion/gestion-turnos/gestion-turnos.component').then(m => m.GestionTurnosComponent)
            }
        ]
    },
    // ============================================
    // RUTAS PRIVADAS - PACIENTE
    // ============================================
    {
        path: 'paciente',
        loadComponent: () => import('./layouts/paciente-layout/paciente-layout.component')
            .then(m => m.PacienteLayoutComponent),
        // canActivate: [authGuard, pacienteGuard], 
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./features/paciente/dashboard/dashboard-paciente/dashboard-paciente.component')
                    .then(m => m.DashboardPacienteComponent)
            },
            {
                path: 'rutina',
                loadComponent: () => import('./features/paciente/rutina/rutina.component')
                    .then(m => m.RutinaComponent)
            },
            {
                path: 'mi-viaje',
                loadComponent: () => import('./features/paciente/mi-viaje/mi-viaje.component')
                    .then(m => m.MiViajeComponent)
            },
            {
                path: 'documentos',
                loadComponent: () => import('./features/paciente/documentos/documentos.component')
                    .then(m => m.DocumentosComponent)
            },
            // --- TURNOS ---
            {
                path: 'sacar-turno',
                loadComponent: () => import('./features/paciente/turnos/sacar-turno/sacar-turno.component')
                    .then(m => m.SacarTurnoComponent)
            },
            {
                path: 'mis-turnos',
                loadComponent: () => import('./features/paciente/turnos/mis-turnos/mis-turnos.component')
                    .then(m => m.MisTurnosComponent)
            },
            {
                path: 'reprogramar/:id',
                loadComponent: () => import('./features/paciente/turnos/reprogramar-turno/reprogramar-turno.component')
                    .then(m => m.ReprogramarTurnoComponent)
            }
        ]
    },
    // ============================================
    // RUTAS PRIVADAS - PROFESIONAL (DERMATÓLOGO)
    // ============================================
    {
        path: 'profesional',
        component: PrivateLayoutComponent,
        // canActivate: [authGuard, profesionalGuard],
        children: [
            // {
            //     path: '',
            //     pathMatch: 'full',
            //     // loadComponent: () => import('./dashboards/dashboard-profesional/dashboard-profesional.component')
            //     //     .then(m => m.DashboardProfesionalComponent)
            // },
            // {
            //   path: 'agenda',
            //   loadComponent: () => import('./features/profesional/agenda/agenda.component')
            //     .then(m => m.AgendaComponent)
            // },
            // {
            //   path: 'mis-pacientes',
            //   loadComponent: () => import('./features/profesional/mis-pacientes/mis-pacientes.component')
            //     .then(m => m.MisPacientesComponent)
            // },
            // {
            //   path: 'perfil-profesional',
            //   loadComponent: () => import('./features/profesional/perfil-profesional/perfil-profesional.component')
            //     .then(m => m.PerfilProfesionalComponent)
            // },
            // {
            //   path: 'mi-perfil',
            //   loadComponent: () => import('./features/auth/perfil/perfil.component')
            //     .then(m => m.PerfilComponent)
            // }
        ]
    },

    // ============================================
    // RUTAS PRIVADAS - RECEPCIONISTA/EMPLEADO
    // ============================================
    {
        path: 'empleado',
        component: PrivateLayoutComponent,
        // canActivate: [authGuard, empleadoGuard],
        children: [
            // {
            //     path: '',
            //     pathMatch: 'full',
            //     // loadComponent: () => import('./dashboards/dashboard-empleado/dashboard-empleado.component')
            //     // .then(m => m.DashboardEmpleadoComponent)
            // },

        ]
    },


    // ============================================
    // WILDCARD - REDIRECCIONAR A LOGIN
    // ============================================
    {
        path: '**',
        redirectTo: 'home'
    }
];
