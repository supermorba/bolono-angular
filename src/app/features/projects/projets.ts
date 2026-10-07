import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { ProjectsService } from './projects.service';
import { dateCourte, dateHeure, fcfa, ilYa, mediaUrl } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { Page } from '../../core/models/common.model';
import type { ProjetAdmin, ProjetDetailAdmin, StatutProjet } from './projects.model';
import { API_ADMIN, derniereValeur, sansVides } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Panneau } from '../../shared/dialogs/fenetres';
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

const STATUTS: Record<StatutProjet, { libelle: string; ton: Ton }> = {
  OUVERT: { libelle: 'Ouvert', ton: 'info' },
  TERMINE: { libelle: 'Terminé', ton: 'succes' },
  ANNULE: { libelle: 'Annulé', ton: 'neutre' },
};

const TON_PARTICIPATION: Record<string, { libelle: string; ton: Ton }> = {
  EN_ATTENTE: { libelle: 'En attente', ton: 'attention' },
  ACCEPTE: { libelle: 'Accepté', ton: 'succes' },
  REFUSE: { libelle: 'Refusé', ton: 'erreur' },
};

/** Fiche d'un projet collaboratif : description, participants et statut. */
@Component({
  selector: 'app-fiche-projet',
  imports: [Panneau, Icon, Avatar, Badge, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fiche-projet.html',
})
export class FicheProjet {
  private readonly api = inject(ProjectsService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly mediaUrl = mediaUrl;
  protected readonly fcfa = fcfa;
  protected readonly dateCourte = dateCourte;
  protected readonly dateHeure = dateHeure;
  protected readonly ilYa = ilYa;
  protected readonly statuts = STATUTS;
  protected readonly participations = TON_PARTICIPATION;
  protected readonly ordreStatuts = Object.keys(STATUTS) as StatutProjet[];

  readonly id = input.required<number>();
  readonly fermer = output<void>();
  readonly modifie = output<void>();

  protected readonly fiche = httpResource<ProjetDetailAdmin>(
    () => `${API_ADMIN}/projets/${this.id()}`,
  );
  protected readonly erreur = computed(() => messageApi(this.fiche.error()));
  protected readonly enCours = signal(false);

  protected lieu(d: ProjetDetailAdmin): string {
    return [d.communeOuQuartier, d.projet.ville].filter((x) => !!x).join(', ') || '—';
  }

  protected async changerStatut(champ: HTMLSelectElement): Promise<void> {
    const projet = this.fiche.value()!.projet;
    const statut = champ.value as StatutProjet;
    const { ok, notification } = await this.confirmation.demander({
      titre: `Passer le projet au statut « ${STATUTS[statut].libelle} » ?`,
      message: `« ${projet.titre} » sera affiché avec ce statut dans l'application.`,
      confirmer: 'Changer le statut',
      danger: statut === 'ANNULE',
      notification: projet.initiateur?.nom ?? "l'initiateur",
    });
    if (!ok) {
      champ.value = projet.statut;
      return;
    }
    this.enCours.set(true);
    this.api.changerStatutProjet(this.id(), statut, notification).subscribe({
      next: (projet) => {
        this.enCours.set(false);
        this.fiche.value.update((d) => (d ? { ...d, projet } : d));
        this.toast.succes(`Projet passé à « ${STATUTS[statut].libelle} ».`);
        this.modifie.emit();
      },
      error: (e) => {
        this.enCours.set(false);
        this.fiche.reload();
        this.toast.erreur(messageApi(e));
      },
    });
  }

  protected async supprimer(): Promise<void> {
    const p = this.fiche.value()!.projet;
    const { ok, notification } = await this.confirmation.demander({
      titre: `Supprimer « ${p.titre} » ?`,
      message: 'Le projet et toutes ses candidatures seront supprimés définitivement.',
      confirmer: 'Supprimer',
      danger: true,
      notification: p.initiateur?.nom ?? "l'initiateur",
    });
    if (!ok) return;
    this.enCours.set(true);
    this.api.supprimerProjet(p.id, notification).subscribe({
      next: () => {
        this.toast.succes('Projet supprimé.');
        this.modifie.emit();
        this.fermer.emit();
      },
      error: (e) => {
        this.enCours.set(false);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}

@Component({
  selector: 'app-projets',
  imports: [EntetePage, Icon, Avatar, Badge, EtatVide, Pagination, Squelette, FicheProjet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projets.html',
})
export class ProjetsPage {
  protected readonly mediaUrl = mediaUrl;
  protected readonly fcfa = fcfa;
  protected readonly statuts = STATUTS;
  protected readonly ordreStatuts = Object.keys(STATUTS) as StatutProjet[];

  protected readonly statut = signal('');
  protected readonly saisie = signal('');
  protected readonly recherche = signal('');
  protected readonly numero = linkedSignal(() => {
    this.statut();
    this.recherche();
    return 0;
  });
  protected readonly liste = httpResource<Page<ProjetAdmin>>(() => ({
    url: `${API_ADMIN}/projets`,
    params: sansVides({
      page: this.numero(),
      size: 12,
      statut: this.statut(),
      q: this.recherche().trim(),
    }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly selection = signal<number | null>(null);
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected rechercher(q: string): void {
    this.saisie.set(q);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recherche.set(q), 300);
  }

  protected progression(p: ProjetAdmin): number {
    return p.artisansRequis
      ? Math.min(100, Math.round((p.participants / p.artisansRequis) * 100))
      : 0;
  }
}
