import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { FirebaseError, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import type { Profil } from './models';

/**
 * Session de l'administrateur.
 *
 * L'identité est portée par Firebase (même projet que l'app mobile) ; le
 * rôle est celui du backend (GET /api/users/me). Seul un compte ADMIN peut
 * ouvrir le back-office : tout autre compte est déconnecté aussitôt.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  // initializeAuth plutôt que getAuth : getAuth installe aussi la connexion par
  // popup/redirection, qui charge un iframe depuis authDomain et peut bloquer
  // indéfiniment l'initialisation (page vierge). Le back-office n'utilise que
  // l'e-mail + mot de passe : seule la persistance locale est nécessaire.
  private readonly auth = initializeAuth(initializeApp(environment.firebase), {
    persistence: browserLocalPersistence,
  });

  private readonly _profil = signal<Profil | null>(null);
  readonly profil = this._profil.asReadonly();
  readonly estAdmin = computed(() => this._profil()?.role === 'ADMIN');

  /**
   * Résolue une fois la session restaurée (ou absente) au démarrage. Bornée
   * dans le temps : si Firebase ne répond pas, les gardes laissent afficher la
   * page de connexion (qui remontera l'erreur) plutôt qu'une page vierge.
   */
  readonly pret: Promise<void>;

  constructor() {
    const restauration = new Promise<void>((resolve) => {
      const stop = onAuthStateChanged(this.auth, async (user) => {
        stop();
        if (user) {
          try {
            await this.chargerProfil(user);
          } catch {
            await signOut(this.auth);
          }
        }
        resolve();
      });
    });
    this.pret = Promise.race([restauration, new Promise<void>((resolve) => setTimeout(resolve, 10_000))]);
  }

  /** Jeton Firebase à transmettre à l'API (rafraîchi automatiquement). */
  async jeton(): Promise<string | null> {
    return (await this.auth.currentUser?.getIdToken()) ?? null;
  }

  async connexion(email: string, motDePasse: string): Promise<void> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email.trim(), motDePasse);
      await this.chargerProfil(credential.user);
    } catch (e) {
      await signOut(this.auth).catch(() => undefined);
      this._profil.set(null);
      throw new Error(messageErreur(e));
    }
  }

  async motDePasseOublie(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email.trim());
    } catch (e) {
      throw new Error(messageErreur(e));
    }
  }

  async deconnexion(): Promise<void> {
    this._profil.set(null);
    await signOut(this.auth);
  }

  private async chargerProfil(user: User): Promise<void> {
    const profil = await firstValueFrom(this.http.get<Profil>(`${environment.apiUrl}/api/users/me`));
    if (profil.role !== 'ADMIN') {
      throw new AccesRefuse();
    }
    this._profil.set({ ...profil, photoUrl: profil.photoUrl ?? user.photoURL });
  }
}

class AccesRefuse extends Error {
  constructor() {
    super("Ce compte n'a pas les droits d'administration de Bolono.");
  }
}

function messageErreur(e: unknown): string {
  if (e instanceof AccesRefuse) return e.message;
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Adresse e-mail ou mot de passe incorrect.';
      case 'auth/invalid-email':
        return 'Adresse e-mail invalide.';
      case 'auth/too-many-requests':
        return 'Trop de tentatives. Réessayez dans quelques minutes.';
      case 'auth/network-request-failed':
        return 'Connexion à Firebase impossible. Vérifiez votre réseau.';
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      case 'auth/invalid-api-key':
      case 'auth/requests-from-referer-blocked':
        return "Configuration Firebase invalide pour le web : enregistrez une application Web dans la console Firebase et reportez sa clé dans environment.ts.";
      default:
        return `Connexion impossible (${e.code}).`;
    }
  }
  if (typeof e === 'object' && e && 'status' in e) {
    const status = (e as { status: number }).status;
    if (status === 0) return "Le serveur Bolono est injoignable. Vérifiez qu'il est démarré.";
    return `Le serveur a refusé la connexion (erreur ${status}).`;
  }
  return 'Une erreur inattendue est survenue.';
}
