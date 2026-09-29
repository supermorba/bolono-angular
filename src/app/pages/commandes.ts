import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../core/admin-api.service';
import { LIBELLES_COMMANDE, dateHeure, fcfa } from '../core/format';
import { messageApi } from '../core/http';
import type {
  OptionsNotification, CommandeAdmin, LivraisonAdmin, ModePaiement, Page, StatutCommande, StatutLivraison } from '../core/models';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../core/ressources';
import { enregistrerFichier } from '../core/telechargement';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { OptionNotification, notificationParDefaut } from '../shared/option-notification';
import { Badge, BarreChargement, ConfirmationService, EtatVide, Pagination, Squelette } from '../shared/ui';
import { TON_COMMANDE } from './dashboard';

/** Étape suivante du cycle de vie d'une commande. */
const SUIVANT: Partial<Record<StatutCommande, { statut: StatutCommande; libelle: string; icone: string }>> = {
  EN_ATTENTE: { statut: 'PAYEE', libelle: 'Marquer payée', icone: 'credit-card' },
  PAYEE: { statut: 'EXPEDIEE', libelle: 'Marquer expédiée', icone: 'truck' },
  EXPEDIEE: { statut: 'LIVREE', libelle: 'Marquer livrée', icone: 'check-circle' },
};

export const LIBELLES_PAIEMENT: Record<ModePaiement, string> = {
  ORANGE_MONEY: 'Orange Money',
  WAVE: 'Wave',
  CARTE_BANCAIRE: 'Carte bancaire',
  PAYPAL: 'PayPal',
};

export const LIBELLES_LIVRAISON: Record<StatutLivraison, string> = {
  EN_PREPARATION: 'En préparation',
  EXPEDIE: 'Expédiée',
  EN_TRANSIT: 'En transit',
  LIVRE: 'Livrée',
  RETARDE: 'Retardée',
};

/** « 2026-09-28T14:30:00 » → « 2026-09-28T14:30 » (champ datetime-local). */
function versChamp(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 16) : '';
}

/** Détail déplié d'une commande : lignes, livraison, paiement, actions. */
@Component({
  selector: 'app-detail-commande',
  imports: [FormsModule, Icon, OptionNotification],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = commande();
    <div class="grid gap-5 lg:grid-cols-3">
      <!-- Contenu et adresse -->
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
        <!-- S'applique aux actions de ce panneau : statut, paiement, livraison. -->
        <app-option-notification class="mt-4 block" [destinataire]="c.client" [(valeur)]="notification" />
        <div class="mt-4 flex flex-wrap gap-2">
          @if (suivant[c.statut]; as s) {
            <button class="btn-accent btn-sm" [disabled]="occupe()" (click)="changerStatut.emit({ statut: s.statut, notification })">
              <app-icon [name]="s.icone" [size]="15" /> {{ s.libelle }}
            </button>
          }
          @if (c.statut !== 'ANNULEE' && c.statut !== 'LIVREE') {
            <button class="btn-outline btn-sm" [disabled]="occupe()" (click)="annuler.emit()">
              <app-icon name="x-circle" [size]="15" /> Annuler la commande
            </button>
          }
        </div>
      </div>

      <!-- Paiement -->
      <form class="rounded-xl border border-line bg-surface p-4" (submit)="$event.preventDefault(); enregistrerPaiement()">
        <p class="mb-3 flex items-center gap-2 text-ms font-bold"><app-icon name="credit-card" [size]="17" /> Paiement</p>
        <label class="block text-xs font-semibold text-muted-strong">
          Mode
          <select class="input mt-1 py-2!" name="mode" [(ngModel)]="paiement.mode">
            <option [ngValue]="null">—</option>
            @for (m of modes; track m) {
              <option [ngValue]="m">{{ libellesPaiement[m] }}</option>
            }
          </select>
        </label>
        <label class="mt-3 block text-xs font-semibold text-muted-strong">
          Référence de transaction
          <input class="input mt-1 py-2!" name="reference" [(ngModel)]="paiement.reference" maxlength="120" />
        </label>
        <label class="mt-3 flex items-center gap-2 text-ms">
          <input type="checkbox" class="h-4 w-4 accent-terracotta" name="valide" [(ngModel)]="paiement.valide" />
          Paiement reçu et vérifié
        </label>
        @if (c.paiement?.date) {
          <p class="mt-1 text-2xs text-muted">Validé le {{ dateHeure(c.paiement?.date) }}</p>
        }
        <button type="submit" class="btn-primary btn-sm mt-4 w-full" [disabled]="occupe()">Enregistrer le paiement</button>
      </form>

      <!-- Livraison -->
      <form class="rounded-xl border border-line bg-surface p-4" (submit)="$event.preventDefault(); enregistrerLivraison()">
        <p class="mb-3 flex items-center gap-2 text-ms font-bold"><app-icon name="truck" [size]="17" /> Livraison</p>
        <div class="grid grid-cols-2 gap-3">
          <label class="col-span-2 block text-xs font-semibold text-muted-strong sm:col-span-1">
            Statut
            <select class="input mt-1 py-2!" name="statut" [(ngModel)]="livraison.statut">
              @for (s of statutsLivraison; track s) {
                <option [ngValue]="s">{{ libellesLivraison[s] }}</option>
              }
            </select>
          </label>
          <label class="col-span-2 block text-xs font-semibold text-muted-strong sm:col-span-1">
            N° de suivi
            <input class="input mt-1 py-2!" name="suivi" [(ngModel)]="livraison.numeroSuivi" maxlength="80" />
          </label>
          <label class="col-span-2 block text-xs font-semibold text-muted-strong">
            Expédiée le
            <input type="datetime-local" class="input mt-1 py-2!" name="expedition" [(ngModel)]="livraison.dateExpedition" />
          </label>
          <label class="col-span-2 block text-xs font-semibold text-muted-strong sm:col-span-1">
            Livraison prévue
            <input type="datetime-local" class="input mt-1 py-2!" name="estimee" [(ngModel)]="livraison.dateLivraisonEstimee" />
          </label>
          <label class="col-span-2 block text-xs font-semibold text-muted-strong sm:col-span-1">
            Livrée le
            <input type="datetime-local" class="input mt-1 py-2!" name="reelle" [(ngModel)]="livraison.dateLivraisonReelle" />
          </label>
        </div>
        <button type="submit" class="btn-primary btn-sm mt-4 w-full" [disabled]="occupe()">Enregistrer la livraison</button>
      </form>
    </div>
  `,
})
export class DetailCommande {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  protected readonly fcfa = fcfa;
  protected readonly dateHeure = dateHeure;
  protected readonly suivant = SUIVANT;
  protected readonly libellesPaiement = LIBELLES_PAIEMENT;
  protected readonly libellesLivraison = LIBELLES_LIVRAISON;
  protected readonly modes = Object.keys(LIBELLES_PAIEMENT) as ModePaiement[];
  protected readonly statutsLivraison = Object.keys(LIBELLES_LIVRAISON) as StatutLivraison[];

  readonly commande = input.required<CommandeAdmin>();
  readonly occupe = input(false);
  readonly modifiee = output<CommandeAdmin>();
  readonly changerStatut = output<{ statut: StatutCommande; notification: OptionsNotification }>();
  readonly annuler = output<void>();

  protected notification = notificationParDefaut();
  protected paiement = { mode: null as ModePaiement | null, reference: '', valide: false };
  protected livraison = {
    statut: 'EN_PREPARATION' as StatutLivraison,
    numeroSuivi: '',
    dateExpedition: '',
    dateLivraisonEstimee: '',
    dateLivraisonReelle: '',
  };

  ngOnInit(): void {
    const c = this.commande();
    this.paiement = { mode: c.paiement?.mode ?? null, reference: c.paiement?.reference ?? '', valide: !!c.paiement?.valide };
    this.livraison = {
      statut: c.livraison?.statut ?? 'EN_PREPARATION',
      numeroSuivi: c.livraison?.numeroSuivi ?? '',
      dateExpedition: versChamp(c.livraison?.dateExpedition),
      dateLivraisonEstimee: versChamp(c.livraison?.dateLivraisonEstimee),
      dateLivraisonReelle: versChamp(c.livraison?.dateLivraisonReelle),
    };
  }

  protected enregistrerPaiement(): void {
    this.api
      .definirPaiement(this.commande().id, {
        valide: this.paiement.valide,
        mode: this.paiement.mode,
        reference: this.paiement.reference.trim() || null,
      }, this.notification)
      .subscribe({
        next: (c) => {
          this.toast.succes(`${c.reference} : paiement enregistré.`);
          this.modifiee.emit(c);
        },
        error: (e) => this.toast.erreur(messageApi(e)),
      });
  }

  protected enregistrerLivraison(): void {
    const l = this.livraison;
    const livraison: LivraisonAdmin = {
      statut: l.statut,
      numeroSuivi: l.numeroSuivi.trim() || null,
      dateExpedition: l.dateExpedition || null,
      dateLivraisonEstimee: l.dateLivraisonEstimee || null,
      dateLivraisonReelle: l.dateLivraisonReelle || null,
    };
    this.api.definirLivraison(this.commande().id, livraison, this.notification).subscribe({
      next: (c) => {
        this.toast.succes(`${c.reference} : livraison enregistrée.`);
        this.modifiee.emit(c);
      },
      error: (e) => this.toast.erreur(messageApi(e)),
    });
  }
}

@Component({
  selector: 'app-commandes',
  imports: [FormsModule, Icon, Badge, BarreChargement, EtatVide, Pagination, Squelette, DetailCommande],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="flex items-center gap-3 text-2xl font-extrabold">Commandes</h1>
        <p class="mt-1 text-sm text-muted-strong">Suivi des commandes de la boutique, du paiement à la livraison.</p>
      </div>
      <button class="btn-outline btn-sm" [disabled]="exportEnCours()" (click)="exporter()">
        @if (exportEnCours()) {
          <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-terracotta"></span> Export…
        } @else {
          <app-icon name="download-simple" [size]="16" /> Exporter (CSV)
        }
      </button>
    </div>

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
                      @if (c.paiement?.valide) {
                        <app-icon name="check-circle" weight="fill" [size]="14" class="ml-0.5 align-[-2px] text-success" />
                      }
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
                        <app-detail-commande
                          [commande]="c"
                          [occupe]="enCours() === c.id"
                          (modifiee)="remplacer($event)"
                          (changerStatut)="changer(c, $event.statut, $event.notification)"
                          (annuler)="annuler(c)"
                        />
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
  private readonly confirmation = inject(ConfirmationService);
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
  protected readonly enCours = signal<number | null>(null);
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

  protected reinitialiser(): void {
    this.saisie.set('');
    this.recherche.set('');
    this.du.set('');
    this.au.set('');
  }

  protected remplacer(maj: CommandeAdmin): void {
    this.page.update((p) => p && { ...p, content: p.content.map((x) => (x.id === maj.id ? maj : x)) });
  }

  protected async annuler(c: CommandeAdmin): Promise<void> {
    const { ok, notification } = await this.confirmation.demander({
      titre: `Annuler la commande ${c.reference} ?`,
      message: `La commande de ${c.client} (${fcfa(c.montant)}) passera au statut « Annulée » et sortira du chiffre d'affaires.`,
      confirmer: 'Annuler la commande',
      danger: true,
      notification: c.client,
    });
    if (ok) this.changer(c, 'ANNULEE', notification);
  }

  protected changer(c: CommandeAdmin, statut: StatutCommande, notification?: OptionsNotification): void {
    this.enCours.set(c.id);
    this.api.changerStatutCommande(c.id, statut, notification).subscribe({
      next: (maj) => {
        this.enCours.set(null);
        this.remplacer(maj);
        this.toast.succes(`${c.reference} : ${LIBELLES_COMMANDE[statut].toLowerCase()}.`);
      },
      error: (e) => {
        this.enCours.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
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
