import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';

@Component({
  selector: 'app-connexion',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connexion.html',
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
