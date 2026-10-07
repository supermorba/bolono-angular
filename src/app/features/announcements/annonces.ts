import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnnouncementsService } from './announcements.service';
import { dateHeure, ilYa, mediaUrl, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { AnnonceAdmin, AudienceAnnonce, PrioriteAnnonce } from './announcements.model';
import type { Page } from '../../core/models/common.model';
import { API_ADMIN, derniereValeur, sansVides } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Televersement } from '../../shared/dialogs/fenetres';
import { Icon } from '../../shared/icons/icon';
import {
  Badge,
  ConfirmationService,
  EtatVide,
  Pagination,
  Squelette,
  EntetePage,
} from '../../shared/components/ui';

const AUDIENCES: Record<AudienceAnnonce, { libelle: string; icone: string }> = {
  TOUS: { libelle: 'Tout le monde', icone: 'users-three' },
  ARTISANS: { libelle: 'Artisans', icone: 'hand-heart' },
  MENTORS: { libelle: 'Mentors', icone: 'chalkboard-teacher' },
  ACHETEURS: { libelle: 'Acheteurs', icone: 'shopping-cart' },
};

/** Composition, diffusion (temps réel + push) et historique des annonces. */
@Component({
  selector: 'app-annonces',
  imports: [EntetePage, FormsModule, Icon, Badge, EtatVide, Pagination, Squelette, Televersement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './annonces.html',
})
export class AnnoncesPage {
  private readonly api = inject(AnnouncementsService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly mediaUrl = mediaUrl;
  protected readonly nombre = nombre;
  protected readonly ilYa = ilYa;
  protected readonly dateHeure = dateHeure;
  protected readonly audiences = AUDIENCES;
  protected readonly ordreAudiences = Object.keys(AUDIENCES) as AudienceAnnonce[];
  /** Valeur minimale du champ d'expiration (heure locale, format datetime-local). */
  protected readonly maintenant = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

  protected readonly audience = signal<AudienceAnnonce>('TOUS');
  protected readonly priorite = signal<PrioriteAnnonce>('INFO');
  protected modele = {
    titre: '',
    message: '',
    lien: '',
    imageUrl: null as string | null,
    dateExpiration: '',
    envoyerPush: true,
  };
  protected readonly publication = signal(false);
  protected readonly retrait = signal<number | null>(null);

  protected readonly portee = httpResource<{ utilisateurs: number }>(() => ({
    url: `${API_ADMIN}/annonces/portee`,
    params: { audience: this.audience() },
  }));
  protected readonly numero = signal(0);
  protected readonly historique = httpResource<Page<AnnonceAdmin>>(() => ({
    url: `${API_ADMIN}/annonces`,
    params: sansVides({ page: this.numero(), size: 10 }),
  }));
  protected readonly page = derniereValeur(this.historique);
  protected readonly erreur = computed(() => messageApi(this.historique.error()));
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected taux(a: AnnonceAdmin): number {
    return a.audienceTotale ? Math.min(100, Math.round((a.lectures / a.audienceTotale) * 100)) : 0;
  }

  protected async publier(): Promise<void> {
    const m = this.modele;
    if (!m.titre.trim() || !m.message.trim()) {
      this.toast.erreur('Le titre et le message sont obligatoires.');
      return;
    }
    const cible = this.portee.hasValue()
      ? nombre(this.portee.value().utilisateurs) + ' utilisateur(s)'
      : 'les utilisateurs visés';
    const { ok } = await this.confirmation.demander({
      titre: 'Publier cette annonce ?',
      message: `Elle sera diffusée immédiatement à ${cible} (${AUDIENCES[this.audience()].libelle.toLowerCase()})${m.envoyerPush ? ', avec une notification push' : ''}.`,
      confirmer: 'Publier',
    });
    if (!ok) return;
    this.publication.set(true);
    this.api
      .publierAnnonce({
        titre: m.titre.trim(),
        message: m.message.trim(),
        lien: m.lien.trim() || null,
        imageUrl: m.imageUrl,
        audience: this.audience(),
        priorite: this.priorite(),
        dateExpiration: m.dateExpiration ? m.dateExpiration + ':00' : null,
        envoyerPush: m.envoyerPush,
      })
      .subscribe({
        next: (a) => {
          this.publication.set(false);
          this.toast.succes('Annonce publiée.');
          this.modele = {
            titre: '',
            message: '',
            lien: '',
            imageUrl: null,
            dateExpiration: '',
            envoyerPush: true,
          };
          this.priorite.set('INFO');
          this.numero.set(0);
          this.historique.reload();
          // Les push partent en arrière-plan : on relit le bilan d'envoi un peu plus tard.
          if (a.envoyerPush) {
            clearTimeout(this.minuterie);
            this.minuterie = setTimeout(() => this.historique.reload(), 6000);
          }
        },
        error: (e) => {
          this.publication.set(false);
          this.toast.erreur(messageApi(e));
        },
      });
  }

  protected async retirer(a: AnnonceAdmin): Promise<void> {
    const { ok } = await this.confirmation.demander({
      titre: 'Retirer cette annonce ?',
      message: `« ${a.titre} » disparaîtra immédiatement des applications.`,
      confirmer: 'Retirer',
      danger: true,
    });
    if (!ok) return;
    this.retrait.set(a.id);
    this.api.retirerAnnonce(a.id).subscribe({
      next: () => {
        this.retrait.set(null);
        this.toast.succes('Annonce retirée.');
        this.historique.reload();
      },
      error: (e) => {
        this.retrait.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
