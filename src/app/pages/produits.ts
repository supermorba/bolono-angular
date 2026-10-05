import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { AdminApi } from '../core/admin-api.service';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../core/ressources';
import { FicheProduit, LIBELLES_TYPE_PRODUIT } from './fiche-produit';
import { dateCourte, fcfa, mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { Page, ProduitAdmin, StatutProduit } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Badge, ConfirmationService, EtatVide, Pagination, Squelette, type Ton, EntetePage } from '../shared/ui';

const ONGLETS: { valeur: StatutProduit | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'EN_LIGNE', libelle: 'En ligne' },
  { valeur: 'MASQUE', libelle: 'Masqués' },
];

const STATUTS: Record<StatutProduit, { libelle: string; ton: Ton }> = {
  EN_LIGNE: { libelle: 'En ligne', ton: 'succes' },
  MASQUE: { libelle: 'Masqué', ton: 'erreur' },
};

@Component({
  selector: 'app-produits',
  imports: [EntetePage, Icon, Badge, EtatVide, Pagination, Squelette, FicheProduit],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-entete-page titre="Produits" [chargement]="liste.isLoading() && !!page()">
    </app-entete-page>

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
            <article class="card card-cliquable group flex flex-col overflow-hidden">
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
                  <span class="absolute top-2.5 right-2.5 rounded-sm bg-brown/70 px-2 py-0.5 text-2xs font-semibold text-white">
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
                  <p class="text-lg leading-none font-bold text-terracotta">{{ fcfa(produit.prixFCFA) }}</p>
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
                  @if (produit.statut === 'MASQUE') {
                    <button class="btn-accent btn-sm flex-1" [disabled]="enCours() === produit.id" (click)="changerVisibilite(produit, true)">
                      <app-icon name="check" [size]="15" /> Remettre en ligne
                    </button>
                  } @else {
                    <button class="btn-outline btn-sm flex-1" [disabled]="enCours() === produit.id" (click)="changerVisibilite(produit, false)">
                      <app-icon name="x" [size]="15" /> Masquer
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
            [titre]="statut() === 'MASQUE' ? 'Aucun produit masqué' : 'Aucun produit'"
            message="Aucun produit ne correspond à ces critères."
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
  protected readonly fcfa = fcfa;
  protected readonly nombre = nombre;
  protected readonly dateCourte = dateCourte;
  protected readonly mediaUrl = mediaUrl;
  protected readonly onglets = ONGLETS;
  protected readonly statuts = STATUTS;

  readonly q = input<string>();
  readonly statutInitial = input<string>(undefined, { alias: 'statut' });

  // ── Filtres (signaux) ────────────────────────────────────────────────────
  /** Sans filtre explicite (?statut=) : tous les produits. */
  protected readonly statut = linkedSignal<StatutProduit | ''>(() => {
    const initial = this.statutInitial();
    return initial && initial in STATUTS ? (initial as StatutProduit) : '';
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

  /** Modération : masque un produit de la boutique ou l'y remet. */
  protected async changerVisibilite(produit: ProduitAdmin, visible: boolean): Promise<void> {
    const { ok, notification } = await this.confirmation.demander(
      visible
        ? {
            titre: `Remettre « ${produit.nom} » en ligne ?`,
            message: 'Le produit sera de nouveau visible par les acheteurs dans la boutique.',
            confirmer: 'Remettre en ligne',
            notification: produit.vendeur,
          }
        : {
            titre: `Masquer « ${produit.nom} » ?`,
            message: 'Le produit ne sera plus visible par les acheteurs. Vous pourrez le remettre en ligne à tout moment.',
            confirmer: 'Masquer',
            danger: true,
            notification: produit.vendeur,
          },
    );
    if (!ok) return;
    this.enCours.set(produit.id);
    this.api.changerVisibiliteProduit(produit.id, visible, notification).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(visible ? `« ${produit.nom} » est de nouveau en ligne.` : `« ${produit.nom} » a été masqué de la boutique.`);
        this.liste.reload();
      },
      error: (e) => {
        this.enCours.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
