import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { ReportsService } from './reports.service';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../../core/api/ressources';
import { dateHeure, mediaUrl } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { OptionsNotification, Page } from '../../core/models/common.model';
import type { SignalementAdmin, SignalementDetail } from './reports.model';
import type { StatutPublication } from '../publications/publications.model';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';
import {
  Badge,
  ConfirmationService,
  EtatVide,
  Pagination,
  Squelette,
  type Ton,
  EntetePage,
} from '../../shared/components/ui';

const STATUTS: Record<StatutPublication, { libelle: string; ton: Ton }> = {
  PUBLIEE: { libelle: 'Visible', ton: 'succes' },
  SIGNALEE: { libelle: 'Masquée automatiquement', ton: 'erreur' },
  MASQUEE: { libelle: 'Masquée', ton: 'neutre' },
  ARCHIVEE: { libelle: 'Archivée', ton: 'neutre' },
};

/** Détail des signalements d'une publication, chargé à l'ouverture. */
@Component({
  selector: 'app-detail-signalements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-signalements.html',
})
export class DetailSignalements {
  protected readonly dateHeure = dateHeure;
  readonly publicationId = input.required<number>();
  protected readonly details = httpResource<SignalementDetail[]>(
    () => `${API_ADMIN}/signalements/${this.publicationId()}/details`,
    { defaultValue: [] },
  );
}

@Component({
  selector: 'app-signalements',
  imports: [EntetePage, Icon, Badge, EtatVide, Pagination, Squelette, DetailSignalements],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './signalements.html',
})
export class SignalementsPage {
  private readonly api = inject(ReportsService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationsService);
  protected readonly dateHeure = dateHeure;
  protected readonly mediaUrl = mediaUrl;
  protected readonly statuts = STATUTS;

  /** Revient à la première page quand le filtre change. */
  protected readonly numero = linkedSignal(() => {
    return 0;
  });
  protected readonly liste = httpResource<Page<SignalementAdmin>>(() => ({
    url: `${API_ADMIN}/signalements`,
    params: sansVides({ page: this.numero(), size: 12 }),
  }));
  /** Page affichée : la précédente reste visible pendant le chargement suivant. */
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly enCours = signal<number | null>(null);
  protected readonly detailOuvert = signal<number | null>(null);

  constructor() {
    rechargerEnDirect(this.liste);
  }

  protected async moderer(s: SignalementAdmin, statut: 'PUBLIEE' | 'MASQUEE'): Promise<void> {
    // « Ignorer » (publication restée visible) ne change rien pour l'auteur : pas de notification.
    const auteurConcerne = s.statut !== statut;
    let notification: OptionsNotification | undefined;
    if (statut === 'MASQUEE' || auteurConcerne) {
      const reponse = await this.confirmation.demander(
        statut === 'MASQUEE'
          ? {
              titre: 'Masquer cette publication ?',
              message:
                "Elle ne sera plus visible dans le fil d'actualité. Vous pourrez la rétablir plus tard.",
              confirmer: 'Masquer',
              danger: true,
              notification: s.auteur ?? "l'auteur",
            }
          : {
              titre: 'Rétablir cette publication ?',
              message:
                'Elle redeviendra visible dans le fil et ses signalements seront remis à zéro.',
              confirmer: 'Rétablir',
              notification: s.auteur ?? "l'auteur",
            },
      );
      if (!reponse.ok) return;
      notification = reponse.notification;
    }
    this.enCours.set(s.publicationId);
    this.api.moderer(s.publicationId, statut, notification).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(
          statut === 'MASQUEE'
            ? 'Publication masquée.'
            : 'Publication rétablie, signalements remis à zéro.',
        );
        this.notifications.rafraichir();
        this.liste.reload();
      },
      error: (e) => {
        this.enCours.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
