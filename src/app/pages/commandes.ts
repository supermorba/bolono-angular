import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../core/admin-api.service';
import { LIBELLES_COMMANDE, LIBELLES_FONDS, LIBELLES_TRANSACTION, dateHeure, fcfa } from '../core/format';
import { messageApi } from '../core/http';
import type {
  CommandeAdmin, ModePaiement, Page, StatutCommande, StatutLivraison, StatutTransaction, TransactionAdmin } from '../core/models';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../core/ressources';
import { enregistrerFichier } from '../core/telechargement';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Badge, BarreChargement, EtatVide, Pagination, Squelette, type Ton, EntetePage } from '../shared/ui';
import { TON_COMMANDE } from './dashboard';

export const LIBELLES_PAIEMENT: Record<ModePaiement, string> = {
  ORANGE_MONEY: 'Orange Money',
  WAVE: 'Wave',
  CARTE_BANCAIRE: 'Carte bancaire',
  PAYPAL: 'PayPal',
  A_LA_LIVRAISON: 'À la livraison',
};

/** Livraison renseignée sur les commandes antérieures aux transactions sécurisées. */
export const LIBELLES_LIVRAISON: Record<StatutLivraison, string> = {
  EN_PREPARATION: 'En préparation',
  EXPEDIE: 'Expédiée',
  EN_TRANSIT: 'En transit',
  LIVRE: 'Livrée',
  RETARDE: 'Retardée',
};

export const TON_TRANSACTION: Record<StatutTransaction, Ton> = {
  CREEE: 'attention',
  PAYEE: 'info',
  ACCEPTEE: 'info',
  EXPEDIEE: 'accent',
  REMISE: 'accent',
  EN_LITIGE: 'erreur',
  LIVREE: 'succes',
  REFUSEE: 'neutre',
  ANNULEE: 'neutre',
  REMBOURSEE: 'neutre',
};

/**
 * Détail déplié d'une commande, en lecture seule : chaque vendeur gère sa
 * part (une transaction sécurisée par vendeur). L'équipe intervient depuis
 * « Paiements et litiges ».
 */
@Component({
  selector: 'app-detail-commande',
  imports: [Icon, Badge, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = commande();
    <div class="grid gap-5 lg:grid-cols-3">
      <div>
        <p class="mb-2 text-2xs font-semibold tracking-wide text-muted-strong uppercase">Articles</p>
        <ul class="divide-y divide-line rounded-xl border border-line bg-surface">
          @for (l of c.lignes; track $index) {
            <li class="flex items-center justify-between gap-3 px-3.5 py-2.5 text-ms">
              <span>{{ l.produit }} <span class="text-muted">× {{ l.quantite }}</span></span>
              <span class="font-semibold whitespace-nowrap">{{ fcfa(l.quantite * l.prixUnitaire) }}</span>
            </li>
          }
          <li class="flex justify-between px-3.5 py-2.5 text-ms font-bold">
            <span>Total</span><span>{{ fcfa(c.montant) }}</span>
          </li>
        </ul>
        <p class="mt-3 flex items-start gap-2 text-ms text-muted-strong">
          <app-icon name="map-pin" [size]="17" class="mt-0.5 shrink-0 text-terracotta" /> {{ c.adresse }}
        </p>
      </div>

      <div class="lg:col-span-2">
        <p class="mb-2 text-2xs font-semibold tracking-wide text-muted-strong uppercase">Colis (un par vendeur)</p>
        @if (colis.value(); as liste) {
          @if (liste.length) {
            <ul class="space-y-2">
              @for (t of liste; track t.reference) {
                <li class="rounded-xl border border-line bg-surface p-3.5">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="font-semibold">{{ t.reference }} · {{ t.vendeur.nom }}</p>
                    <app-badge [ton]="tonsTransaction[t.statut]">{{ libellesTransaction[t.statut] }}</app-badge>
                  </div>
                  <p class="mt-1 text-xs text-muted-strong">
                    {{ fcfa(t.montant) }} · {{ t.mode === 'SEQUESTRE' ? 'Fonds : ' + libellesFonds[t.fonds] : 'Payé à la livraison' }}
                    @if (t.transporteur || t.numeroSuivi) {
                      · {{ t.transporteur }} {{ t.numeroSuivi }}
                    }
                  </p>
                  @if (t.motif) {
                    <p class="mt-1 text-xs text-muted">Motif : {{ t.motif }}</p>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="text-ms text-muted">Commande antérieure aux transactions sécurisées.</p>
          }
        } @else if (colis.isLoading()) {
          <p class="text-ms text-muted">Chargement…</p>
        }
        <a routerLink="/paiements" class="mt-3 inline-flex items-center gap-1.5 text-ms font-semibold text-terracotta hover:underline">
          <app-icon name="lock-simple" [size]="15" /> Paiements, litiges, remboursements et versements
        </a>
      </div>
    </div>
  `,
})
export class DetailCommande {
  protected readonly fcfa = fcfa;
  protected readonly libellesTransaction = LIBELLES_TRANSACTION;
  protected readonly libellesFonds = LIBELLES_FONDS;
  protected readonly tonsTransaction = TON_TRANSACTION;

  readonly commande = input.required<CommandeAdmin>();
  protected readonly colis = httpResource<TransactionAdmin[]>(() => `${API_ADMIN}/transactions/commande/${this.commande().id}`);
}

@Component({
  selector: 'app-commandes',
  imports: [EntetePage, FormsModule, Icon, Badge, BarreChargement, EtatVide, Pagination, Squelette, DetailCommande],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-entete-page titre="Commandes">
      <button actions class="btn-outline btn-sm" [disabled]="exportEnCours()" (click)="exporter()">
        @if (exportEnCours()) {
          <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-terracotta"></span> Export…
        } @else {
          <app-icon name="download-simple" [size]="16" /> Exporter (CSV)
        }
      </button>
    </app-entete-page>

    <div class="onglets mb-4 sm:w-fit" role="tablist">
      @for (o of onglets; track o.valeur) {
        <button class="onglet" [class.onglet-actif]="statut() === o.valeur" role="tab" [attr.aria-selected]="statut() === o.valeur" (click)="statut.set(o.valeur)">
          {{ o.libelle }}
        </button>
      }
    </div>

    <div class="card relative p-4 sm:p-5">
      <app-barre-chargement [actif]="liste.isLoading() && !!page()" />
      <!-- Filtres -->
      <div class="mb-4 flex flex-wrap items-end gap-3">
        <div class="relative w-full sm:max-w-xs">
          <app-icon name="magnifying-glass" [size]="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input type="search" class="input py-2! pl-9!" placeholder="Référence, client ou e-mail" [value]="saisie()" (input)="rechercher($any($event.target).value)" />
        </div>
        <label class="text-xs font-semibold text-muted-strong">
          Du
          <input type="date" class="input mt-1 w-auto! py-2!" [value]="du()" (change)="du.set($any($event.target).value)" />
        </label>
        <label class="text-xs font-semibold text-muted-strong">
          Au
          <input type="date" class="input mt-1 w-auto! py-2!" [value]="au()" (change)="au.set($any($event.target).value)" />
        </label>
        @if (du() || au() || recherche()) {
          <button class="btn-sm text-xs font-semibold text-terracotta hover:underline" (click)="reinitialiser()">Effacer les filtres</button>
        }
      </div>

      @if (liste.error() && !page()) {
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="liste.reload()">Réessayer</button>
        </app-etat-vide>
      } @else if (page(); as p) {
        @if (p.content.length) {
          <div class="overflow-x-auto transition-opacity" [class.opacity-60]="liste.isLoading()">
            <table class="table">
              <thead>
                <tr>
                  <th>Commande</th><th class="hidden sm:table-cell">Client</th><th class="hidden lg:table-cell">Produit(s)</th>
                  <th class="text-right">Montant</th><th class="hidden xl:table-cell">Paiement</th><th>Statut</th>
                  <th class="hidden md:table-cell">Livraison</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (c of p.content; track c.id) {
                  <tr class="cursor-pointer" (click)="ouverte.set(ouverte() === c.id ? null : c.id)">
                    <td class="whitespace-nowrap">
                      <p class="font-semibold">{{ c.reference }}</p>
                      <p class="text-2xs text-muted">{{ dateHeure(c.date) }}</p>
                      <p class="text-xs text-muted sm:hidden">{{ c.client }}</p>
                    </td>
                    <td class="hidden sm:table-cell">
                      <p class="font-medium whitespace-nowrap">{{ c.client }}</p>
                      @if (c.clientEmail) {
                        <p class="text-xs text-muted">{{ c.clientEmail }}</p>
                      }
                    </td>
                    <td class="hidden text-muted-strong lg:table-cell">
                      {{ c.lignes[0]?.produit ?? '—' }}{{ c.lignes.length > 1 ? ' +' + (c.lignes.length - 1) : '' }}
                    </td>
                    <td class="text-right font-semibold whitespace-nowrap">{{ fcfa(c.montant) }}</td>
                    <td class="hidden text-xs whitespace-nowrap text-muted-strong xl:table-cell">
                      {{ c.paiement?.mode ? libellesPaiement[c.paiement!.mode!] : '—' }}
                    </td>
                    <td><app-badge [ton]="tons[c.statut]">{{ libelles[c.statut] }}</app-badge></td>
                    <td class="hidden text-xs whitespace-nowrap text-muted-strong md:table-cell">
                      {{ c.livraison?.statut ? libellesLivraison[c.livraison!.statut!] : '—' }}
                      @if (c.livraison?.numeroSuivi) {
                        <span class="block text-2xs text-muted">{{ c.livraison?.numeroSuivi }}</span>
                      }
                    </td>
                    <td class="text-right">
                      <app-icon [name]="ouverte() === c.id ? 'caret-down' : 'caret-right'" [size]="16" class="text-muted" />
                    </td>
                  </tr>
                  @if (ouverte() === c.id) {
                    <tr class="bg-ochre-surface/50! hover:bg-ochre-surface/50!">
                      <td colspan="8" class="py-4!" (click)="$event.stopPropagation()">
                        <app-detail-commande [commande]="c" />
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
          <app-pagination [page]="p.number" [pages]="p.totalPages" [total]="p.totalElements" (changer)="numero.set($event)" />
        } @else {
          <app-etat-vide icone="shopping-cart" titre="Aucune commande" message="Aucune commande ne correspond à ces critères." />
        }
      } @else {
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <app-squelette class="my-2" [hauteur]="44" />
        }
      }
    </div>
  `,
})
export class CommandesPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  protected readonly fcfa = fcfa;
  protected readonly dateHeure = dateHeure;
  protected readonly libelles = LIBELLES_COMMANDE;
  protected readonly tons = TON_COMMANDE;
  protected readonly libellesPaiement = LIBELLES_PAIEMENT;
  protected readonly libellesLivraison = LIBELLES_LIVRAISON;
  protected readonly onglets: { valeur: StatutCommande | ''; libelle: string }[] = [
    { valeur: '', libelle: 'Toutes' },
    { valeur: 'EN_ATTENTE', libelle: 'En attente' },
    { valeur: 'PAYEE', libelle: 'Payées' },
    { valeur: 'EXPEDIEE', libelle: 'Expédiées' },
    { valeur: 'LIVREE', libelle: 'Livrées' },
    { valeur: 'ANNULEE', libelle: 'Annulées' },
  ];

  // ── Filtres ───────────────────────────────────────────────────────────────
  protected readonly statut = signal<StatutCommande | ''>('');
  protected readonly saisie = signal('');
  protected readonly recherche = signal('');
  protected readonly du = signal('');
  protected readonly au = signal('');
  protected readonly numero = linkedSignal(() => {
    this.statut();
    this.recherche();
    this.du();
    this.au();
    return 0;
  });

  // ── Données ───────────────────────────────────────────────────────────────
  protected readonly liste = httpResource<Page<CommandeAdmin>>(() => ({
    url: `${API_ADMIN}/commandes`,
    params: sansVides({
      statut: this.statut(),
      q: this.recherche().trim(),
      du: this.du(),
      au: this.au(),
      page: this.numero(),
      size: 15,
    }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly ouverte = signal<number | null>(null);
  protected readonly exportEnCours = signal(false);
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    rechargerEnDirect(this.liste);
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected rechercher(texte: string): void {
    this.saisie.set(texte);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recherche.set(texte), 300);
  }

  /** Remet tous les filtres à zéro (statut, recherche, dates). */
  protected reinitialiser(): void {
    clearTimeout(this.minuterie);
    this.statut.set('');
    this.saisie.set('');
    this.recherche.set('');
    this.du.set('');
    this.au.set('');
  }

  protected exporter(): void {
    this.exportEnCours.set(true);
    this.api
      .exporterCommandes(sansVides({ statut: this.statut(), q: this.recherche().trim(), du: this.du(), au: this.au() }))
      .subscribe({
        next: (fichier) => {
          this.exportEnCours.set(false);
          enregistrerFichier(fichier, `commandes-bolono-${new Date().toISOString().slice(0, 10)}.csv`);
        },
        error: (e) => {
          this.exportEnCours.set(false);
          this.toast.erreur(messageApi(e, "L'export a échoué."));
        },
      });
  }
}
