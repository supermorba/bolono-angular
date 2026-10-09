import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Subscription } from 'rxjs';
import { dateHeure, ilYa } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { Activite, TypeActivite } from './activity.model';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { Icon } from '../../shared/icons/icon';
import { EtatVide, Squelette, EntetePage } from '../../shared/components/ui';
import { STYLE_ACTIVITE, cheminLien, parametresLien, texteActivite } from './activity.presentation';
import { ActivityService } from './activity.service';

const FILTRES: { valeur: TypeActivite | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tout' },
  { valeur: 'COMMANDE', libelle: 'Commandes' },
  { valeur: 'PRODUIT', libelle: 'Produits' },
  { valeur: 'INSCRIPTION', libelle: 'Inscriptions' },
  { valeur: 'FORMATION', libelle: 'Formations' },
  { valeur: 'COMPLETION', libelle: 'Formations terminées' },
  { valeur: 'MENTORAT', libelle: 'Mentorat' },
];

/** Journal complet de l'activité de la plateforme, chargé par pages successives. */
@Component({
  selector: 'app-activite',
  imports: [EntetePage, RouterLink, Icon, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activite.html',
})
export class ActivitePage {
  private readonly api = inject(ActivityService);
  protected readonly styles = STYLE_ACTIVITE;
  protected readonly filtres = FILTRES;
  protected readonly ilYa = ilYa;
  protected readonly dateHeure = dateHeure;
  protected readonly cheminLien = cheminLien;
  protected readonly parametresLien = parametresLien;
  protected readonly texteActivite = texteActivite;

  protected readonly type = signal<TypeActivite | ''>('');
  protected readonly elements = signal<Activite[]>([]);
  protected readonly suivante = signal(false);
  protected readonly chargement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  private page = 0;
  private requete: Subscription | null = null;

  constructor() {
    // Nouveau filtre : on repart de la première page.
    effect(() => {
      this.type();
      this.elements.set([]);
      this.charger(true);
    });
    // Événement temps réel : la première page est rechargée.
    const notifications = inject(NotificationsService);
    let premier = true;
    effect(() => {
      notifications.revision();
      if (premier) {
        premier = false;
        return;
      }
      this.charger(true);
    });
    inject(DestroyRef).onDestroy(() => this.requete?.unsubscribe());
  }

  protected charger(depuisDebut: boolean): void {
    this.requete?.unsubscribe();
    const page = depuisDebut ? 0 : this.page + 1;
    this.chargement.set(true);
    this.erreur.set(null);
    this.requete = this.api.charger(this.type(), page).subscribe({
      next: (r) => {
        this.page = page;
        this.elements.update((liste) => (depuisDebut ? r.contenu : [...liste, ...r.contenu]));
        this.suivante.set(r.suivante);
        this.chargement.set(false);
      },
      error: (e) => {
        this.chargement.set(false);
        this.erreur.set(messageApi(e));
      },
    });
  }
}
