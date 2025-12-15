import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from '@angular/fire/auth';
import { FirestoreService } from './firestore.service';
import { Router } from '@angular/router';
import { EstadoUsuario, RolUsuario, Usuario } from '../interfaces/usuario.model';
import { Paciente } from '../interfaces/paciente.model';
import { Profesional } from '../interfaces/profesional.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private firestoreService: FirestoreService = inject(FirestoreService);
  private router: Router = inject(Router);

  currentUser: WritableSignal<Usuario | null | undefined> = signal(undefined);

  isAuthStatusLoaded: WritableSignal<boolean> = signal(false);

  constructor() {
    onAuthStateChanged(this.auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          const user = await this.firestoreService.getDocument<Usuario>('usuarios', firebaseUser.uid);
          const userWithVerificationStatus: Usuario = {
            ...user!,
            correoVerificado: firebaseUser.emailVerified
          };

          console.log("Usuario con datos (y verificación): ", userWithVerificationStatus);
          this.currentUser.set(userWithVerificationStatus || null);

          // this.firestoreService.updateDocument('usuarios/pacientes', firebaseUser.uid, {
          //   online: true,
          //   lastSeen: new Date()
          // });

        } else {
          this.currentUser.set(null);
        }
        this.isAuthStatusLoaded.set(true);
      });
  }


  // Metodo para el Registro
  async register({ email, password, telefono, apellido, nombre, rol, dni }: any) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = userCredential.user;

      const newUser: Usuario = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        telefono,
        apellido,
        nombre,
        dni: dni || '',
        rol: rol || RolUsuario.PACIENTE,
        estado: EstadoUsuario.ACTIVO,
        correoVerificado: firebaseUser.emailVerified
      };

      await this.firestoreService.setDocument('usuarios', firebaseUser.uid, newUser);

      return firebaseUser;

    } catch (error) {
      console.error('Error: en el register() ', error);
      alert('No se pudo completar el registro, es posble que el correo este en uso');
      throw error;
    }
  }

  // Metodo para el Registro de Profesional
  async registerProfesional({ email, password, telefono, apellido, nombre, dni, numeroMatriculaNacional, numeroMatriculaProvincial, tituloProfesional }: any) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = userCredential.user;

      const newProfesional: Profesional = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        telefono,
        apellido,
        nombre,
        dni,
        rol: RolUsuario.DERMATOLOGO,
        estado: EstadoUsuario.ACTIVO,
        correoVerificado: firebaseUser.emailVerified,
        numeroMatriculaNacional,
        numeroMatriculaProvincial,
        tituloProfesional: tituloProfesional || '',
        horariosLaborales: {},
        duracionConsulta: 30,
        honorarios: []
      };

      await this.firestoreService.setDocument('usuarios', firebaseUser.uid, newProfesional);

      return firebaseUser;

    } catch (error) {
      console.error('Error: en el registerProfesional() ', error);
      alert('No se pudo completar el registro de profesional');
      throw error;
    }
  }

  // Metodo para enviar un email de confirmacion
  async sendEmailVerification(): Promise<void> {
    const firebaseUser = this.auth.currentUser;

    if (!firebaseUser) {
      throw new Error('No hay usuario autenticado');
    }
    if (firebaseUser.emailVerified) {
      throw new Error('No hay usuario autenticado');
    }
    try {
      await sendEmailVerification(firebaseUser);
      console.log(`Correo de verificación enviado a: ${firebaseUser.email}`);
    } catch (error) {
      console.error('Error al enviar verificación:', error);
      throw new Error('No se pudo enviar el correo de verificación');
    }
  }

  async login({ email, password }: any) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      await user.reload();

      // if (!user.emailVerified) {
      //   throw new Error('Debes verificar tu correo antes de ingresar.');
      // }
      const appUser = await this.firestoreService.getDocument<Usuario>('usuarios', user.uid);

      if (!appUser) {
        throw new Error('No se encontraron datos del usuario en la base de datos.');
      }

      if (user.emailVerified && appUser.correoVerificado !== true) {
        await this.firestoreService.updateDocument('usuarios', user.uid, { correoVerificado: true });
      }
      const userWithVerificationStatus: Usuario = {
        ...appUser!,
        correoVerificado: user.emailVerified
      };

      await this.firestoreService.updateDocument('usuarios', user.uid, {
        online: true,
        lastSeen: new Date()
      });

      this.currentUser.set(userWithVerificationStatus || null);

      // Navigate based on role after successful login
      this.navigateBasedOnRole(appUser.rol);

    } catch (error: any) {
      console.error("Error en el login", error);
      throw new Error(error.message || 'Error en el login, revisa tus credenciales.');
    }
  }

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);
      const { user } = userCredential;

      const displayName = user.displayName || "";

      const partes = displayName.trim().split(" ");
      let nombre = "";
      let apellido = "";

      if (partes.length > 1) {
        nombre = partes[0];
        apellido = partes[partes.length - 1]; // último elemento
      } else {
        nombre = displayName; // si solo hay un nombre
      }

      let appUser = await this.firestoreService.getDocumentById<Usuario>('usuarios', user.uid)

      // Si el usuario no existe, crear uno nuevo con rol PACIENTE
      if (!appUser) {
        console.log(`Usuario con UID:${user.uid} no encontrado, Creando doc nuevo...`);
        const newUser: Usuario = {
          uid: user.uid,
          email: user.email!,
          telefono: '',
          apellido: apellido,
          nombre: nombre,
          dni: '',
          rol: RolUsuario.PACIENTE,
          estado: EstadoUsuario.ACTIVO,
          fotoPerfil: user.photoURL || '',
          correoVerificado: user.emailVerified
        };

        await this.firestoreService.setDocument('usuarios', user.uid, newUser);
        appUser = newUser;
      }

      // Actualizar el estado del usuario actual
      this.currentUser.set({
        ...appUser,
        correoVerificado: user.emailVerified
      });

      // Actualizar estado online
      await this.firestoreService.updateDocument('usuarios', user.uid, {
        online: true,
        lastSeen: new Date()
      });

      this.navigateBasedOnRole(appUser.rol);
    } catch (error) {
      console.error('Error en login con google', error);
      throw error;
    }
  }

  private navigateBasedOnRole(rol: RolUsuario) {
    console.log("Rol Usuario: ", rol);

    if (rol === RolUsuario.PACIENTE) {
      this.router.navigate(['/paciente']);
    } else {
      // Admin, Dermatologo, Recepcionista, Empleado
      this.router.navigate(['/admin']);
    }
  }

  // Metodo para el LogOut
  async logOut() {
    const user = this.currentUser();
    if (user) {
      await this.firestoreService.updateDocument('usuarios', user.uid, {
        online: false,
        lastSeen: new Date()
      });
    }
    await signOut(this.auth);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }


  async resetPassword(email: string): Promise<void> {
    // Metodo para enviar email de recuperacion de la contraseña
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      console.error("Error al enviar email de recuperación", error);
      throw new Error(error.message || 'No se pudo enviar el email de recuperación.');
    }
  }
}
