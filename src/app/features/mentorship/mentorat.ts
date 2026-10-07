import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { MentorshipService } from './mentorship.service';
import { environment } from '../../../environments/environment';
import { derniereValeur, rechargerEnDirect, sansVides } from '../../core/api/ressources';
import { dateCourte, dateHeure } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { CandidatureMentor, StatutCandidature } from './mentorship.model';
import type { Page } from '../../core/models/common.model';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';
import {
  Avatar,
  Badge,
  ConfirmationService,
  EtatVide,
  Pagination,
  Squelette,
  type Ton,
  EntetePage,
} from '../../shared/components/ui';

const STATUTS: Record<StatutCandidature, { libelle: string; ton: Ton }> = {
  EN_ATTENTE: { libelle: 'En attente', ton: 'attention' },
  ACCEPTE: { libelle: 'Acceptée', ton: 'succes' },
  REFUSE: { libelle: 'Refusée', ton: 'erreur' },
};

@Component({
  selector: 'app-mentorat',
  imports: [EntetePage, Icon, Avatar, Badge, EtatVide, Pagination, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mentorat.html',
})
export class MentoratPage {
  private readonly api = inject(MentorshipService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationsService);
  protected readonly dateCourte = dateCourte;
  protected readonly dateHeure = dateHeure;
  protected readonly statuts = STATUTS;
  protected readonly onglets: { valeur: StatutCandidature | ''; libelle: string }[] = [
    { valeur: 'EN_ATTENTE', libelle: 'En attente' },
    { valeur: 'ACCEPTE', libelle: 'Acceptées' },
    { valeur: 'REFUSE', libelle: 'Refusées' },
    { valeur: '', libelle: 'Toutes' },
  ];

  protected readonly statut = signal<StatutCandidature | ''>('EN_ATTENTE');
  /** Revient à la première page quand le filtre change. */
  protected readonly numero = linkedSignal(() => {
    this.statut();
    return 0;
  });
  protected readonly liste = httpResource<Page<CandidatureMentor>>(() => ({
    url: `${environment.apiUrl}/api/users/admin/candidatures-mentor`,
    params: sansVides({ statut: this.statut(), page: this.numero(), size: 12 }),
  }));
  /** Page affichée : la précédente reste visible pendant le chargement suivant. */
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly enCours = signal<number | null>(null);

  constructor() {
    rechargerEnDirect(this.liste);
  }

  protected filtrer(statut: StatutCandidature | ''): void {
    this.statut.set(statut);
  }

  protected async decider(c: CandidatureMentor, statut: 'ACCEPTE' | 'REFUSE'): Promise<void> {
    const reponse = await this.confirmation.demander(
      statut === 'ACCEPTE'
        ? {
            titre: `Faire de ${c.artisanNom} un mentor ?`,
            message: 'Il pourra publier des formations et des statuts visibles par ses abonnés.',
            confirmer: 'Accepter',
            notification: c.artisanNom,
          }
        : {
            titre: `Refuser la candidature de ${c.artisanNom} ?`,
            message: 'Le motif est enregistré avec la candidature.',
            confirmer: 'Refuser',
            danger: true,
            champ: { libelle: 'Motif du refus', obligatoire: true },
            notification: c.artisanNom,
          },
    );
    if (!reponse.ok) return;
    this.enCours.set(c.id);
    this.api.deciderCandidature(c.id, statut, reponse.texte, reponse.notification).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(
          statut === 'ACCEPTE' ? `${c.artisanNom} est désormais mentor.` : 'Candidature refusée.',
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
