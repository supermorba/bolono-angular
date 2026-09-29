import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-connexion',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-screen lg:grid-cols-2">
      <!-- Visuel -->
      <div class="relative hidden overflow-hidden bg-sidebar lg:block">
        <img src="images/artisan.jpg" alt="" class="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div class="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/60 to-sidebar/20"></div>
        <div class="absolute inset-x-0 bottom-0 h-24 bg-[url(/motifs.svg)] bg-[length:auto_100%] bg-repeat-x opacity-70"></div>
        <div class="relative flex h-full flex-col justify-between p-12 text-white">
          <div class="flex items-center gap-3">
            <img src="images/bolono-logo.svg" alt="" class="h-11 w-11" />
            <span class="text-3xl font-extrabold text-accent-clair">Bolono</span>
          </div>
          <div class="mb-24 max-w-md">
            <p class="text-3xl leading-tight font-extrabold">Ensemble, valorisons le savoir-faire malien.</p>
            <p class="mt-3 text-sm text-white/75">
              Espace d'administration : suivez l'activité, validez les produits et les mentors, et veillez à la qualité de la
              communauté.
            </p>
          </div>
        </div>
      </div>

      <!-- Formulaire -->
      <div class="flex items-center justify-center p-6">
        <form class="w-full max-w-sm" (submit)="$event.preventDefault(); connecter(email.value, mdp.value)">
          <div class="mb-8 flex items-center gap-3 lg:hidden">
            <img src="images/bolono-logo.svg" alt="" class="h-10 w-10" />
            <span class="text-2xl font-extrabold text-terracotta">Bolono</span>
          </div>
          <h1 class="text-2xl font-extrabold">Connexion administrateur</h1>
          <p class="mt-1.5 text-sm text-muted-strong">Réservé aux comptes disposant du rôle administrateur.</p>

          <label class="mt-8 block text-xs font-semibold text-muted-strong">
            Adresse e-mail
            <input #email type="email" autocomplete="username" required class="input mt-1.5" placeholder="admin@bolono.ml" />
          </label>
          <label class="mt-4 block text-xs font-semibold text-muted-strong">
            Mot de passe
            <span class="relative mt-1.5 block">
              <input
                #mdp
                [type]="afficher() ? 'text' : 'password'"
                autocomplete="current-password"
                required
                class="input pr-10"
              />
              <button
                type="button"
                class="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-brown"
                (click)="afficher.set(!afficher())"
                [attr.aria-label]="afficher() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                <app-icon [name]="afficher() ? 'eye-slash' : 'eye'" [size]="18" />
              </button>
            </span>
          </label>

          @if (erreur(); as message) {
            <p class="mt-4 flex items-start gap-2 rounded-xl bg-error-surface px-3 py-2.5 text-sm text-error" role="alert">
              <app-icon name="warning" weight="fill" [size]="18" class="mt-px" /> {{ message }}
            </p>
          }

          <button type="submit" class="btn-primary mt-6 w-full py-3" [disabled]="enCours()">
            @if (enCours()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
            } @else {
              <app-icon name="lock-simple" [size]="18" />
            }
            Se connecter
          </button>
          <button type="button" class="link-accent mt-4 block w-full text-center" (click)="oublie(email.value)">Mot de passe oublié ?</button>
        </form>
      </div>
    </div>
  `,
})
export class ConnexionPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly enCours = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly afficher = signal(false);

  protected async connecter(email: string, motDePasse: string): Promise<void> {
    if (!email.trim() || !motDePasse) return;
    this.enCours.set(true);
    this.erreur.set(null);
    try {
      await this.auth.connexion(email, motDePasse);
      await this.router.navigate(['/']);
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.enCours.set(false);
    }
  }

  protected async oublie(email: string): Promise<void> {
    if (!email.trim()) {
      this.erreur.set('Saisissez votre adresse e-mail pour recevoir le lien de réinitialisation.');
      return;
    }
    try {
      await this.auth.motDePasseOublie(email);
      this.erreur.set(null);
      this.toast.succes(`Un lien de réinitialisation a été envoyé à ${email.trim()}.`);
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }
}
