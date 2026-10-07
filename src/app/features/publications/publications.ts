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
import { PublicationsService } from './publications.service';
import { dateHeure, ilYa, mediaUrl, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { CategorieAdmin } from '../settings/settings.model';
import type { CommentaireAdmin, PublicationAdmin, StatutPublication } from './publications.model';
import type { Page } from '../../core/models/common.model';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../../core/api/ressources';
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

export const STATUTS_PUBLICATION: Record<StatutPublication, { libelle: string; ton: Ton }> = {
  PUBLIEE: { libelle: 'Visible', ton: 'succes' },
  SIGNALEE: { libelle: 'Masquée (signalements)', ton: 'erreur' },
  MASQUEE: { libelle: 'Masquée', ton: 'neutre' },
  ARCHIVEE: { libelle: 'Archivée', ton: 'neutre' },
};

/** Panneau des commentaires d'une publication, avec suppression. */
@Component({
  selector: 'app-commentaires-publication',
  imports: [Panneau, Avatar, Icon, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './commentaires-publication.html',
})
export class CommentairesPublication {
  private readonly api = inject(PublicationsService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly ilYa = ilYa;

  readonly publication = input.required<PublicationAdmin>();
  readonly fermer = output<void>();
  readonly supprime = output<void>();

  protected readonly commentaires = httpResource<CommentaireAdmin[]>(
    () => `${API_ADMIN}/publications/${this.publication().id}/commentaires`,
  );
  protected readonly erreur = computed(() => messageApi(this.commentaires.error()));
  protected readonly suppression = signal<number | null>(null);

  protected async supprimer(c: CommentaireAdmin): Promise<void> {
    const { ok, notification } = await this.confirmation.demander({
      titre: 'Supprimer ce commentaire ?',
      message: `« ${c.texte.slice(0, 120)}${c.texte.length > 120 ? '…' : ''} »`,
      confirmer: 'Supprimer',
      danger: true,
      notification: c.auteur?.nom ?? "l'auteur",
    });
    if (!ok) return;
    this.suppression.set(c.id);
    this.api.supprimerCommentaire(c.id, notification).subscribe({
      next: () => {
        this.suppression.set(null);
        this.commentaires.value.update((liste) => liste?.filter((x) => x.id !== c.id));
        this.supprime.emit();
        this.toast.succes('Commentaire supprimé.');
      },
      error: (e) => {
        this.suppression.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}

@Component({
  selector: 'app-publications',
  imports: [
    EntetePage,
    Icon,
    Avatar,
    Badge,
    EtatVide,
    Pagination,
    Squelette,
    CommentairesPublication,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publications.html',
})
export class PublicationsPage {
  private readonly api = inject(PublicationsService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationsService);
  protected readonly dateHeure = dateHeure;
  protected readonly ilYa = ilYa;
  protected readonly nombre = nombre;
  protected readonly mediaUrl = mediaUrl;
  protected readonly statuts = STATUTS_PUBLICATION;
  protected readonly filtresStatut: { valeur: string; libelle: string }[] = [
    { valeur: '', libelle: 'Toutes' },
    { valeur: 'PUBLIEE', libelle: 'Visibles' },
    { valeur: 'SIGNALEE', libelle: 'Signalées' },
    { valeur: 'MASQUEE', libelle: 'Masquées' },
  ];

  protected readonly statut = signal('');
  protected readonly categorie = signal('');
  protected readonly saisie = signal('');
  protected readonly recherche = signal('');
  /** Revient à la première page quand un filtre change. */
  protected readonly numero = linkedSignal(() => {
    this.statut();
    this.categorie();
    this.recherche();
    return 0;
  });

  protected readonly liste = httpResource<Page<PublicationAdmin>>(() => ({
    url: `${API_ADMIN}/publications`,
    params: sansVides({
      page: this.numero(),
      size: 12,
      statut: this.statut(),
      categorie: this.categorie(),
      q: this.recherche().trim(),
    }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly categories = httpResource<CategorieAdmin[]>(
    () => ({ url: `${API_ADMIN}/categories`, params: { type: 'PUBLICATION' } }),
    { defaultValue: [] },
  );
  protected readonly enCours = signal<number | null>(null);
  protected readonly commentaires = signal<PublicationAdmin | null>(null);
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    rechargerEnDirect(this.liste);
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected rechercher(q: string): void {
    this.saisie.set(q);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recherche.set(q), 300);
  }

  protected async changerStatut(
    pub: PublicationAdmin,
    statut: 'PUBLIEE' | 'MASQUEE',
  ): Promise<void> {
    const auteur = pub.auteur?.nom ?? "l'auteur";
    const { ok, notification } = await this.confirmation.demander(
      statut === 'MASQUEE'
        ? {
            titre: 'Masquer cette publication ?',
            message:
              "Elle disparaîtra du fil d'actualité. Vous pourrez la rendre visible à nouveau.",
            confirmer: 'Masquer',
            danger: true,
            notification: auteur,
          }
        : {
            titre: 'Rendre cette publication visible ?',
            message:
              "Elle réapparaîtra dans le fil d'actualité ; ses signalements éventuels seront remis à zéro.",
            confirmer: 'Rendre visible',
            notification: auteur,
          },
    );
    if (!ok) return;
    this.enCours.set(pub.id);
    this.api.changerStatutPublication(pub.id, statut, notification).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(
          statut === 'MASQUEE' ? 'Publication masquée.' : 'Publication de nouveau visible.',
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

  protected async supprimer(pub: PublicationAdmin): Promise<void> {
    const { ok, notification } = await this.confirmation.demander({
      titre: 'Supprimer définitivement cette publication ?',
      message: `Ses ${pub.commentaires} commentaire(s), ses mentions « j'aime » et ses signalements seront aussi supprimés.`,
      confirmer: 'Supprimer',
      danger: true,
      notification: pub.auteur?.nom ?? "l'auteur",
    });
    if (!ok) return;
    this.enCours.set(pub.id);
    this.api.supprimerPublication(pub.id, notification).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes('Publication supprimée.');
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
