import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { AdminApi } from '../core/admin-api.service';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../core/ressources';
import { FicheProduit, LIBELLES_TYPE_PRODUIT } from './fiche-produit';
import { dateCourte, fcfa, mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { Page, ProduitAdmin, StatutProduit } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Badge, ConfirmationService, EtatVide, Pagination, Squelette, type Ton } from '../shared/ui';

const ONGLETS: { valeur: StatutProduit | ''; libelle: string }[] = [
  { valeur: 'EN_ATTENTE', libelle: 'À valider' },
  { valeur: 'EN_LIGNE', libelle: 'En ligne' },
  { valeur: 'REFUSE', libelle: 'Refusés' },
  { valeur: '', libelle: 'Tous' },
];

const STATUTS: Record<StatutProduit, { libelle: string; ton: Ton }> = {
  EN_ATTENTE: { libelle: 'À valider', ton: 'attention' },
  EN_LIGNE: { libelle: 'En ligne', ton: 'succes' },
  REFUSE: { libelle: 'Refusé', ton: 'erreur' },
};

@Component({
  selector: 'app-produits',
  imports: [Icon, Badge, EtatVide, Pagination, Squelette, FicheProduit],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <h1 class="flex items-center gap-3 text-2xl font-extrabold">
        Produits
        @if (liste.isLoading() && page()) {
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-terracotta" aria-label="Mise à jour"></span>
        }
      </h1>
      <p class="mt-1 text-sm text-muted-strong">
        Un produit n'apparaît dans la boutique de l'application qu'une fois validé.
      </p>
    </div>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <div class="onglets" role="tablist">
        @for (o of onglets; track o.valeur) {
          <button
            class="onglet"
            [class.onglet-actif]="statut() === o.valeur"
            role="tab"
            [attr.aria-selected]="statut() === o.valeur"
            (click)="filtrer(o.valeur)"
          >
            {{ o.libelle }}
          </button>
        }
      </div>
      <div class="relative w-full sm:ml-auto sm:max-w-xs">
        <app-icon name="magnifying-glass" [size]="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input type="search" class="input py-2! pl-9!" placeholder="Nom du produit" [value]="saisie()" (input)="rechercher($any($event.target).value)" />
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
        <div class="grid grid-cols-1 items-start gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" [class.opacity-60]="liste.isLoading()">
          @for (produit of p.content; track produit.id) {
            <article class="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
              <button
                type="button"
                class="relative block aspect-16/10 w-full shrink-0 overflow-hidden bg-sand text-left"
                (click)="selection.set(produit.id)"
                [attr.aria-label]="'Ouvrir la fiche de ' + produit.nom"
              >
                @if (mediaUrl(produit.images[0]); as src) {
                  <img
                    [src]="src"
                    [alt]="produit.nom"
                    class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                } @else {
                  <span class="absolute inset-0 flex items-center justify-center text-sand-deep"><app-icon name="image" [size]="36" /></span>
                }
                <app-badge class="absolute top-2.5 left-2.5" [ton]="statuts[produit.statut].ton">{{ statuts[produit.statut].libelle }}</app-badge>
                @if (produit.images.length > 1) {
                  <span class="absolute top-2.5 right-2.5 rounded-full bg-brown/70 px-2 py-0.5 text-2xs font-semibold text-white">
                    {{ produit.images.length }} photos
                  </span>
                }
              </button>

              <div class="flex flex-1 flex-col gap-2 p-4">
                <div class="flex items-center justify-between gap-2 text-2xs text-muted">
                  <span class="truncate font-semibold tracking-wide uppercase">
                    {{ produit.categorie ?? (produit.type ? typesProduit[produit.type] : '—') }}
                  </span>
                  <span class="shrink-0">{{ dateCourte(produit.dateCreation) }}</span>
                </div>

                <div class="min-w-0">
                  <h2 class="truncate font-bold" [title]="produit.nom">{{ produit.nom }}</h2>
                  @if (produit.description) {
                    <p class="mt-0.5 line-clamp-2 text-xs text-muted-strong">{{ produit.description }}</p>
                  }
                </div>

                <div class="flex items-end justify-between gap-2">
                  <p class="text-lg leading-none font-extrabold text-terracotta">{{ fcfa(produit.prixFCFA) }}</p>
                  <p class="text-2xs text-muted-strong">
                    <span class="font-semibold text-brown">{{ produit.stock ?? '—' }}</span> {{ produit.uniteMesure ?? '' }} en stock ·
                    <span class="font-semibold text-brown">{{ nombre(produit.ventes) }}</span> vendus
                  </p>
                </div>

                <p class="flex min-w-0 items-center gap-1.5 border-t border-line pt-2 text-xs text-muted-strong">
                  <app-icon name="user" [size]="14" class="text-muted" />
                  <span class="truncate font-semibold text-brown">{{ produit.vendeur ?? '—' }}</span>
                </p>

                <div class="mt-auto flex gap-2 pt-1">
                  @if (produit.statut !== 'EN_LIGNE') {
                    <button class="btn-accent btn-sm flex-1" [disabled]="enCours() === produit.id" (click)="valider(produit, true)">
                      <app-icon name="check" [size]="15" /> {{ produit.statut === 'REFUSE' ? 'Remettre en ligne' : 'Valider' }}
                    </button>
                  }
                  @if (produit.statut !== 'REFUSE') {
                    <button class="btn-outline btn-sm flex-1" [disabled]="enCours() === produit.id" (click)="valider(produit, false)">
                      <app-icon name="x" [size]="15" /> {{ produit.statut === 'EN_LIGNE' ? 'Retirer' : 'Refuser' }}
                    </button>
                  }
                </div>
              </div>
            </article>
          }
        </div>
        <app-pagination [page]="p.number" [pages]="p.totalPages" [total]="p.totalElements" (changer)="numero.set($event)" />
      } @else {
        <div class="card">
          <app-etat-vide
            icone="package"
            [titre]="statut() === 'EN_ATTENTE' ? 'Aucun produit à valider' : 'Aucun produit'"
            [message]="statut() === 'EN_ATTENTE' ? 'Tous les produits proposés ont été examinés.' : 'Aucun produit ne correspond à ces critères.'"
          />
        </div>
      }
    } @else {
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <app-squelette [hauteur]="320" />
        }
      </div>
    }

    @if (selection(); as id) {
      <app-fiche-produit [id]="id" (fermer)="selection.set(null)" (modifie)="liste.reload()" />
    }
  `,
})
export class ProduitsPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationsService);
  protected readonly fcfa = fcfa;
  protected readonly nombre = nombre;
  protected readonly dateCourte = dateCourte;
  protected readonly mediaUrl = mediaUrl;
  protected readonly onglets = ONGLETS;
  protected readonly statuts = STATUTS;

  readonly q = input<string>();
  readonly statutInitial = input<string>(undefined, { alias: 'statut' });

  // ── Filtres (signaux) ────────────────────────────────────────────────────
  /** Sans filtre explicite : la file de validation, sauf si l'on cherche un produit précis. */
  protected readonly statut = linkedSignal<StatutProduit | ''>(() => {
    const initial = this.statutInitial();
    return initial && initial in STATUTS ? (initial as StatutProduit) : this.q() ? '' : 'EN_ATTENTE';
  });
  protected readonly saisie = linkedSignal(() => this.q() ?? '');
  protected readonly recherche = linkedSignal(() => this.q() ?? '');
  protected readonly numero = linkedSignal(() => {
    this.statut();
    this.recherche();
    return 0;
  });
  protected readonly enCours = signal<number | null>(null);
  protected readonly selection = signal<number | null>(null);
  protected readonly typesProduit = LIBELLES_TYPE_PRODUIT;

  // ── Données ──────────────────────────────────────────────────────────────
  protected readonly liste = httpResource<Page<ProduitAdmin>>(() => ({
    url: `${API_ADMIN}/produits`,
    params: sansVides({ q: this.recherche().trim(), statut: this.statut(), page: this.numero(), size: 12 }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));

  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    rechargerEnDirect(this.liste);
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected filtrer(statut: StatutProduit | ''): void {
    this.statut.set(statut);
  }

  protected rechercher(q: string): void {
    this.saisie.set(q);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recherche.set(q), 300);
  }

  protected async valider(produit: ProduitAdmin, valide: boolean): Promise<void> {
    const { ok, notification } = await this.confirmation.demander(
      valide
        ? {
            titre: `Mettre « ${produit.nom} » en ligne ?`,
            message: 'Le produit sera visible par les acheteurs dans la boutique.',
            confirmer: 'Mettre en ligne',
            notification: produit.vendeur,
          }
        : {
            titre: produit.statut === 'EN_LIGNE' ? `Retirer « ${produit.nom} » de la boutique ?` : `Refuser « ${produit.nom} » ?`,
            message: 'Le produit ne sera plus visible par les acheteurs. Vous pourrez le remettre en ligne à tout moment.',
            confirmer: produit.statut === 'EN_LIGNE' ? 'Retirer' : 'Refuser',
            danger: true,
            notification: produit.vendeur,
          },
    );
    if (!ok) return;
    this.enCours.set(produit.id);
    this.api.validerProduit(produit.id, valide, notification).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(valide ? `« ${produit.nom} » est en ligne.` : `« ${produit.nom} » a été retiré de la boutique.`);
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
