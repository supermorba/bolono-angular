import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { AdminApi } from '../core/admin-api.service';
import { dateHeure, ilYa, mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { CategorieAdmin, CommentaireAdmin, Page, PublicationAdmin, StatutPublication } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Panneau } from '../shared/fenetres';
import { Icon } from '../shared/icon';
import { Avatar, Badge, ConfirmationService, EtatVide, Pagination, Squelette, type Ton, EntetePage } from '../shared/ui';

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
  template: `
    <app-panneau [titre]="'Commentaires · ' + (publication().titre || 'Publication')" (fermer)="fermer.emit()">
      @if (commentaires.error()) {
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="commentaires.reload()">Réessayer</button>
        </app-etat-vide>
      } @else if (commentaires.hasValue()) {
        <ul class="flex flex-col gap-3">
          @for (c of commentaires.value(); track c.id) {
            <li class="group flex gap-3 rounded-xl border border-line p-3">
              <app-avatar [photo]="c.auteur?.photoUrl" [nom]="c.auteur?.nom" [size]="34" />
              <div class="min-w-0 flex-1">
                <p class="text-ms"><b>{{ c.auteur?.nom ?? 'Compte supprimé' }}</b> <span class="text-xs text-muted">· {{ ilYa(c.date) }}</span></p>
                <p class="mt-0.5 text-sm break-words whitespace-pre-line text-muted-strong">{{ c.texte }}</p>
              </div>
              <button
                class="self-start rounded-lg p-1.5 text-muted hover:bg-error-surface hover:text-error"
                [disabled]="suppression() === c.id"
                (click)="supprimer(c)"
                aria-label="Supprimer le commentaire"
              >
                <app-icon name="trash" [size]="16" />
              </button>
            </li>
          } @empty {
            <app-etat-vide icone="chat-circle-text" titre="Aucun commentaire" />
          }
        </ul>
      } @else {
        @for (i of [1, 2, 3]; track i) {
          <app-squelette class="mb-3" [hauteur]="64" />
        }
      }
    </app-panneau>
  `,
})
export class CommentairesPublication {
  private readonly api = inject(AdminApi);
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
  imports: [EntetePage, Icon, Avatar, Badge, EtatVide, Pagination, Squelette, CommentairesPublication],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-entete-page titre="Publications" [chargement]="liste.isLoading() && !!page()">
    </app-entete-page>

    <div class="card mb-5 flex flex-wrap items-center gap-3 p-3 sm:p-4">
      <div class="flex gap-1 overflow-x-auto rounded-xl bg-card p-1">
        @for (f of filtresStatut; track f.valeur) {
          <button class="onglet" [class.onglet-actif]="statut() === f.valeur" (click)="statut.set(f.valeur)">{{ f.libelle }}</button>
        }
      </div>
      <select class="input w-auto! py-2! text-xs!" [value]="categorie()" (change)="categorie.set($any($event.target).value)" aria-label="Catégorie">
        <option value="">Toutes les catégories</option>
        @for (c of categories.value(); track c.id) {
          <option [value]="c.nom">{{ c.nom }}</option>
        }
      </select>
      <div class="relative w-full sm:ml-auto sm:max-w-xs">
        <app-icon name="magnifying-glass" [size]="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input type="search" class="input py-2! pl-9!" placeholder="Texte, auteur" [value]="saisie()" (input)="rechercher($any($event.target).value)" />
      </div>
    </div>

    @if (liste.error() && !page()) {
      <div class="card">
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="liste.reload()">Réessayer</button>
        </app-etat-vide>
      </div>
    } @else if (page(); as p) {
      @if (p.content.length) {
        <div class="grid grid-cols-1 items-start gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3" [class.opacity-60]="liste.isLoading()">
          @for (pub of p.content; track pub.id) {
            <article class="card flex flex-col overflow-hidden">
              @if (mediaUrl(pub.mediaUrls[0]); as src) {
                <div class="relative">
                  <img [src]="src" alt="" class="aspect-video w-full object-cover" loading="lazy" />
                  @if (pub.mediaUrls.length > 1) {
                    <span class="absolute right-2 bottom-2 rounded-sm bg-black/60 px-2 py-0.5 text-2xs font-semibold text-white">+{{ pub.mediaUrls.length - 1 }}</span>
                  }
                </div>
              }
              <div class="flex flex-1 flex-col p-4">
                <div class="flex items-center gap-2.5">
                  <app-avatar [photo]="pub.auteur?.photoUrl" [nom]="pub.auteur?.nom" [size]="32" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-ms font-semibold">{{ pub.auteur?.nom ?? 'Compte supprimé' }}</p>
                    <p class="text-2xs text-muted" [title]="dateHeure(pub.datePublication)">{{ ilYa(pub.datePublication) }}{{ pub.categorie ? ' · ' + pub.categorie : '' }}</p>
                  </div>
                  <app-badge [ton]="statuts[pub.statut].ton">{{ statuts[pub.statut].libelle }}</app-badge>
                </div>
                @if (pub.titre) {
                  <h2 class="mt-3 font-bold">{{ pub.titre }}</h2>
                }
                <p class="mt-1 line-clamp-4 text-sm whitespace-pre-line text-muted-strong">{{ pub.contenu || (pub.audioUrl ? 'Message vocal' : '—') }}</p>
                @if (pub.audioUrl) {
                  <audio [src]="mediaUrl(pub.audioUrl)" controls preload="none" class="mt-2 h-9 w-full"></audio>
                }
                <div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-strong">
                  <span class="inline-flex items-center gap-1"><app-icon name="hand-heart" [size]="14" /> {{ nombre(pub.likes) }}</span>
                  <button class="inline-flex items-center gap-1 hover:text-brown hover:underline" (click)="commentaires.set(pub)">
                    <app-icon name="chat-circle-text" [size]="14" /> {{ nombre(pub.commentaires) }} commentaire{{ pub.commentaires > 1 ? 's' : '' }}
                  </button>
                  @if (pub.nbSignalements) {
                    <span class="inline-flex items-center gap-1 text-error"><app-icon name="flag" [size]="14" /> {{ pub.nbSignalements }}</span>
                  }
                </div>
                <div class="mt-3 flex gap-2 border-t border-line pt-3">
                  @if (pub.statut === 'PUBLIEE') {
                    <button class="btn-outline btn-sm flex-1" [disabled]="enCours() === pub.id" (click)="changerStatut(pub, 'MASQUEE')">
                      <app-icon name="eye-slash" [size]="15" /> Masquer
                    </button>
                  } @else {
                    <button class="btn-outline btn-sm flex-1" [disabled]="enCours() === pub.id" (click)="changerStatut(pub, 'PUBLIEE')">
                      <app-icon name="eye" [size]="15" /> Rendre visible
                    </button>
                  }
                  <button class="btn-outline btn-sm text-error!" [disabled]="enCours() === pub.id" (click)="supprimer(pub)" aria-label="Supprimer la publication">
                    <app-icon name="trash" [size]="15" />
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
        <app-pagination [page]="p.number" [pages]="p.totalPages" [total]="p.totalElements" (changer)="numero.set($event)" />
      } @else {
        <div class="card">
          <app-etat-vide icone="chat-circle-text" titre="Aucune publication" message="Aucune publication ne correspond à ces filtres." />
        </div>
      }
    } @else {
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <app-squelette [hauteur]="280" />
        }
      </div>
    }

    @if (commentaires(); as pub) {
      <app-commentaires-publication [publication]="pub" (fermer)="commentaires.set(null)" (supprime)="liste.reload()" />
    }
  `,
})
export class PublicationsPage {
  private readonly api = inject(AdminApi);
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

  protected async changerStatut(pub: PublicationAdmin, statut: 'PUBLIEE' | 'MASQUEE'): Promise<void> {
    const auteur = pub.auteur?.nom ?? "l'auteur";
    const { ok, notification } = await this.confirmation.demander(
      statut === 'MASQUEE'
        ? {
            titre: 'Masquer cette publication ?',
            message: "Elle disparaîtra du fil d'actualité. Vous pourrez la rendre visible à nouveau.",
            confirmer: 'Masquer',
            danger: true,
            notification: auteur,
          }
        : {
            titre: 'Rendre cette publication visible ?',
            message: "Elle réapparaîtra dans le fil d'actualité ; ses signalements éventuels seront remis à zéro.",
            confirmer: 'Rendre visible',
            notification: auteur,
          },
    );
    if (!ok) return;
    this.enCours.set(pub.id);
    this.api.changerStatutPublication(pub.id, statut, notification).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(statut === 'MASQUEE' ? 'Publication masquée.' : 'Publication de nouveau visible.');
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
