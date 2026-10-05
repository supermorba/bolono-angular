import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../core/admin-api.service';
import { LIBELLES_ACTION_TRANSACTION, LIBELLES_FONDS, LIBELLES_TRANSACTION, dateHeure, fcfa } from '../core/format';
import { messageApi } from '../core/http';
import type { DecisionLitige, PaiementEnAttente, StatutTransaction, TransactionAdmin } from '../core/models';
import { API_ADMIN, rechargerEnDirect, sansVides } from '../core/ressources';
import { NotificationsService } from '../core/notifications.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Badge, BarreChargement, ConfirmationService, EtatVide, Squelette, EntetePage } from '../shared/ui';
import { LIBELLES_PAIEMENT, TON_TRANSACTION } from './commandes';

type Onglet = 'paiements' | 'litiges' | 'rembourser' | 'verser' | 'toutes';
const ONGLETS_VALIDES: Onglet[] = ['paiements', 'litiges', 'rembourser', 'verser', 'toutes'];

/** Détail d'une transaction : articles, parties, litige et journal (qui fait foi). */
@Component({
  selector: 'app-detail-transaction',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = transaction();
    <div class="grid gap-4 text-ms lg:grid-cols-3">
      <div>
        <p class="mb-1.5 text-2xs font-semibold tracking-wide text-muted-strong uppercase">Articles</p>
        <ul class="divide-y divide-line rounded-xl border border-line bg-surface">
          @for (a of t.articles; track $index) {
            <li class="flex justify-between gap-3 px-3 py-2">
              <span>{{ a.libelle }} <span class="text-muted">× {{ a.quantite }}</span></span>
              <span class="font-semibold whitespace-nowrap">{{ fcfa(a.sousTotal) }}</span>
            </li>
          }
          <li class="flex justify-between px-3 py-2 text-xs text-muted-strong">
            <span>Part vendeur</span><span>{{ fcfa(t.montantVendeur) }}</span>
          </li>
        </ul>
        <p class="mt-2 flex items-start gap-1.5 text-xs text-muted-strong">
          <app-icon name="map-pin" [size]="15" class="mt-0.5 shrink-0 text-terracotta" /> {{ t.adresseLivraison }}
        </p>
      </div>
      <div class="space-y-2">
        <p class="text-2xs font-semibold tracking-wide text-muted-strong uppercase">Parties</p>
        <p><span class="text-muted">Acheteur :</span> {{ t.acheteur.nom }} {{ t.acheteur.telephone ?? '' }}</p>
        <p><span class="text-muted">Vendeur :</span> {{ t.vendeur.nom }} {{ t.vendeur.telephone ?? '' }}</p>
        @if (t.transporteur || t.numeroSuivi) {
          <p><span class="text-muted">Expédition :</span> {{ t.transporteur }} {{ t.numeroSuivi }}</p>
        }
        @if (t.photoExpedition) {
          <div>
            <p class="text-xs text-muted">Photo du colis à l'expédition</p>
            <a [href]="t.photoExpedition" target="_blank" rel="noopener">
              <img [src]="t.photoExpedition" alt="Colis à l'expédition" class="mt-1 h-20 w-20 rounded-lg object-cover" />
            </a>
          </div>
        }
        <p>
          <span class="text-muted">Versement :</span>
          @if (t.compteVersementVendeur) {
            {{ t.compteVersementVendeur }}
          } @else {
            <span class="text-error">compte non renseigné, contacter le vendeur</span>
          }
        </p>
        @if (t.litige; as l) {
          <div class="rounded-xl bg-warning-surface p-3">
            <p class="font-semibold">{{ l.motif }}</p>
            @if (l.description) {
              <p class="mt-1 text-xs whitespace-pre-line text-muted-strong">{{ l.description }}</p>
            }
            <p class="mt-1 text-2xs text-muted">Ouvert le {{ dateHeure(l.ouvertLe) }}</p>
            @if (l.preuvesAcheteur.length) {
              <div class="mt-2 flex flex-wrap gap-1.5">
                @for (url of l.preuvesAcheteur; track url) {
                  <a [href]="url" target="_blank" rel="noopener">
                    <img [src]="url" alt="Preuve de l'acheteur" class="h-16 w-16 rounded-lg object-cover" />
                  </a>
                }
              </div>
            }
            @if (l.reponseVendeur) {
              <p class="mt-3 text-xs font-semibold">Version du vendeur</p>
              <p class="text-xs whitespace-pre-line text-muted-strong">{{ l.reponseVendeur }}</p>
              @if (l.preuvesVendeur.length) {
                <div class="mt-2 flex flex-wrap gap-1.5">
                  @for (url of l.preuvesVendeur; track url) {
                    <a [href]="url" target="_blank" rel="noopener">
                      <img [src]="url" alt="Preuve du vendeur" class="h-16 w-16 rounded-lg object-cover" />
                    </a>
                  }
                </div>
              }
            } @else if (!l.decision) {
              <p class="mt-3 text-xs text-muted">Le vendeur n'a pas encore donné sa version.</p>
            }
            @if (l.decision) {
              <p class="mt-2 text-xs font-semibold">
                {{ l.decision === 'EN_FAVEUR_ACHETEUR' ? 'Tranché pour l’acheteur' : 'Tranché pour le vendeur' }}
              </p>
              <p class="text-xs text-muted-strong">{{ l.commentaireDecision }}</p>
            }
          </div>
        }
      </div>
      <div>
        <p class="mb-1.5 text-2xs font-semibold tracking-wide text-muted-strong uppercase">Historique</p>
        @if (detail.value(); as d) {
          <ol class="space-y-1.5 border-l-2 border-line pl-3">
            @for (e of d.journal; track $index) {
              <li>
                <p class="font-medium">{{ libellesAction[e.action] ?? e.action }}</p>
                <p class="text-2xs text-muted">{{ dateHeure(e.date) }}@if (e.commentaire) { · {{ e.commentaire }}}</p>
              </li>
            }
          </ol>
        } @else {
          <p class="text-xs text-muted">Chargement…</p>
        }
      </div>
    </div>
  `,
})
export class DetailTransaction {
  protected readonly fcfa = fcfa;
  protected readonly dateHeure = dateHeure;
  protected readonly libellesAction = LIBELLES_ACTION_TRANSACTION;
  readonly transaction = input.required<TransactionAdmin>();
  /** Les listes n'ont pas de journal : il est chargé avec le détail. */
  protected readonly detail = httpResource<TransactionAdmin>(() => `${API_ADMIN}/transactions/${this.transaction().reference}`);
}

/** Confirmation de la réception d'un paiement : montant reçu et référence de l'opération. */
@Component({
  selector: 'app-confirmation-paiement',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = paiement();
    <form class="flex flex-wrap items-end gap-2" (submit)="$event.preventDefault(); envoyer()">
      <label class="text-xs font-semibold text-muted-strong">
        Montant reçu (FCFA)
        <input class="input mt-1 w-36! py-2!" type="number" min="0" name="montant" [(ngModel)]="montant" required />
      </label>
      <label class="text-xs font-semibold text-muted-strong">
        Référence de l'opération
        <input class="input mt-1 w-52! py-2!" name="operation" [(ngModel)]="operation" maxlength="120" required
          placeholder="ID Orange Money / Wave" />
      </label>
      <button class="btn-accent btn-sm" type="submit" [disabled]="occupe() || !operation.trim() || montant === null">
        <app-icon name="check-circle" [size]="15" /> Confirmer
      </button>
      @if (montant !== null && montant < p.montant) {
        <p class="w-full text-2xs text-error">Inférieur aux {{ fcfa(p.montant) }} attendus : le serveur refusera.</p>
      }
    </form>
  `,
})
export class ConfirmationPaiement {
  protected readonly fcfa = fcfa;
  readonly paiement = input.required<PaiementEnAttente>();
  readonly occupe = input(false);
  readonly confirmer = output<{ montant: number; operation: string }>();
  protected montant: number | null = null;
  protected operation = '';

  ngOnInit(): void {
    this.montant = this.paiement().montant;
  }

  protected envoyer(): void {
    if (this.montant === null || !this.operation.trim()) return;
    this.confirmer.emit({ montant: this.montant, operation: this.operation.trim() });
  }
}

/**
 * « Paiements et litiges » : les vendeurs gèrent leurs commandes, l'équipe
 * intervient seulement ici. Chaque mouvement d'argent est enregistré avec la
 * référence de l'opération ; chaque arbitrage est motivé et communiqué aux
 * deux parties.
 */
@Component({
  selector: 'app-paiements',
  imports: [EntetePage, Icon, Badge, BarreChargement, EtatVide, Squelette, DetailTransaction, ConfirmationPaiement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-entete-page titre="Paiements et litiges">
    </app-entete-page>

    <div class="onglets mb-4 sm:w-fit" role="tablist">
      @for (o of onglets; track o.valeur) {
        <button class="onglet" [class.onglet-actif]="onglet() === o.valeur" role="tab" [attr.aria-selected]="onglet() === o.valeur" (click)="onglet.set(o.valeur)">
          {{ o.libelle }}
          @if (o.compte && o.compte() > 0) {
            <span class="min-w-5 rounded-full bg-terracotta px-1.5 text-center text-2xs leading-5 font-bold text-white">{{ o.compte() }}</span>
          }
        </button>
      }
    </div>

    <div class="card relative p-4 sm:p-5">
      @if (onglet() === 'paiements') {
        <app-barre-chargement [actif]="paiements.isLoading()" />
        @if (paiements.value(); as liste) {
          @if (liste.length) {
            <ul class="divide-y divide-line">
              @for (p of liste; track p.reference) {
                <li class="py-4">
                  <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p class="font-semibold">{{ p.reference }} · {{ fcfa(p.montant) }}</p>
                      <p class="text-xs text-muted-strong">
                        {{ p.acheteur?.nom }} {{ p.acheteur?.telephone ?? '' }} ·
                        {{ p.moyen ? (libellesPaiement[$any(p.moyen)] ?? p.moyen) : 'Moyen non précisé' }} ·
                        {{ dateHeure(p.creeLe) }} · {{ p.transactions.length }} vendeur(s)
                      </p>
                    </div>
                  </div>
                  <app-confirmation-paiement [paiement]="p" [occupe]="enCours() === p.reference"
                    (confirmer)="confirmerPaiement(p, $event.montant, $event.operation)" />
                </li>
              }
            </ul>
          } @else {
            <app-etat-vide icone="credit-card" titre="Aucun paiement en attente" message="Les paiements à rapprocher apparaîtront ici." />
          }
        } @else if (paiements.error()) {
          <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur(paiements.error())" />
        } @else {
          <app-squelette [hauteur]="64" />
        }
      } @else {
        @if (onglet() === 'toutes') {
          <div class="mb-4 flex flex-wrap gap-1.5">
            @for (s of statuts; track s.valeur) {
              <button class="rounded-md border px-3 py-1 text-xs font-semibold"
                [class]="filtreStatut() === s.valeur ? 'border-terracotta bg-terracotta-light text-terracotta' : 'border-line text-muted-strong'"
                (click)="filtreStatut.set(s.valeur)">{{ s.libelle }}</button>
            }
          </div>
        }
        <app-barre-chargement [actif]="transactions.isLoading()" />
        @if (transactions.value(); as liste) {
          @if (liste.length) {
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Transaction</th><th class="hidden sm:table-cell">Acheteur → vendeur</th>
                    <th class="text-right">Montant</th><th>Étape</th><th class="hidden md:table-cell">Fonds</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of liste; track t.reference) {
                    <tr class="cursor-pointer" (click)="ouverte.set(ouverte() === t.reference ? null : t.reference)">
                      <td class="whitespace-nowrap">
                        <p class="font-semibold">{{ t.reference }}</p>
                        <p class="text-2xs text-muted">{{ dateHeure(t.creeeLe) }}</p>
                      </td>
                      <td class="hidden sm:table-cell">
                        {{ t.acheteur.nom }} → {{ t.vendeur.nom }}
                        @if (onglet() === 'verser') {
                          <span class="block text-2xs" [class]="t.compteVersementVendeur ? 'text-muted' : 'text-error'">
                            {{ t.compteVersementVendeur ?? 'Compte de versement non renseigné' }}
                          </span>
                        }
                      </td>
                      <td class="text-right font-semibold whitespace-nowrap">
                        {{ fcfa(onglet() === 'verser' ? t.montantVendeur : t.montant) }}
                      </td>
                      <td><app-badge [ton]="tons[t.statut]">{{ libellesTransaction[t.statut] }}</app-badge></td>
                      <td class="hidden text-xs text-muted-strong md:table-cell">{{ libellesFonds[t.fonds] }}</td>
                      <td class="text-right whitespace-nowrap" (click)="$event.stopPropagation()">
                        @switch (onglet()) {
                          @case ('litiges') {
                            <button class="btn-outline btn-sm" [disabled]="enCours() === t.reference" (click)="trancher(t, 'EN_FAVEUR_ACHETEUR')">Acheteur</button>
                            <button class="btn-outline btn-sm ml-1.5" [disabled]="enCours() === t.reference" (click)="trancher(t, 'EN_FAVEUR_VENDEUR')">Vendeur</button>
                          }
                          @case ('rembourser') {
                            <button class="btn-accent btn-sm" [disabled]="enCours() === t.reference" (click)="marquer(t, true)">Marquer remboursé</button>
                          }
                          @case ('verser') {
                            <button class="btn-accent btn-sm" [disabled]="enCours() === t.reference" (click)="marquer(t, false)">Marquer versé</button>
                          }
                          @default {
                            <app-icon [name]="ouverte() === t.reference ? 'caret-down' : 'caret-right'" [size]="16" class="text-muted" />
                          }
                        }
                      </td>
                    </tr>
                    @if (ouverte() === t.reference) {
                      <tr class="bg-ochre-surface/50! hover:bg-ochre-surface/50!">
                        <td colspan="6" class="py-4!"><app-detail-transaction [transaction]="t" /></td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-etat-vide icone="check-circle" [titre]="vide()" />
          }
        } @else if (transactions.error()) {
          <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur(transactions.error())" />
        } @else {
          @for (i of [1, 2, 3]; track i) {
            <app-squelette class="my-2" [hauteur]="44" />
          }
        }
      }
    </div>
  `,
})
export class PaiementsPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly notifications = inject(NotificationsService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly fcfa = fcfa;
  protected readonly dateHeure = dateHeure;
  protected readonly libellesTransaction = LIBELLES_TRANSACTION;
  protected readonly libellesFonds = LIBELLES_FONDS;
  protected readonly libellesPaiement: Record<string, string> = LIBELLES_PAIEMENT;
  protected readonly tons = TON_TRANSACTION;

  /** Compteurs de la cloche, repris dans les onglets. */
  protected readonly onglets: { valeur: Onglet; libelle: string; compte?: () => number }[] = [
    { valeur: 'paiements', libelle: 'Paiements à confirmer', compte: () => this.notifications.compteurs()?.paiementsAConfirmer ?? 0 },
    { valeur: 'litiges', libelle: 'Litiges', compte: () => this.notifications.compteurs()?.litigesEnCours ?? 0 },
    { valeur: 'rembourser', libelle: 'À rembourser', compte: () => this.notifications.compteurs()?.remboursementsAEffectuer ?? 0 },
    { valeur: 'verser', libelle: 'À verser', compte: () => this.notifications.compteurs()?.versementsAEffectuer ?? 0 },
    { valeur: 'toutes', libelle: 'Toutes les transactions' },
  ];
  protected readonly statuts: { valeur: StatutTransaction | ''; libelle: string }[] = [
    { valeur: '', libelle: 'Toutes' },
    ...(Object.keys(LIBELLES_TRANSACTION) as StatutTransaction[]).map((s) => ({ valeur: s, libelle: LIBELLES_TRANSACTION[s] })),
  ];

  /** Onglet ouvert depuis la cloche (?onglet=). */
  readonly ongletInitial = input<string>(undefined, { alias: 'onglet' });
  protected readonly onglet = linkedSignal<Onglet>(() => {
    const o = this.ongletInitial();
    return ONGLETS_VALIDES.includes(o as Onglet) ? (o as Onglet) : 'paiements';
  });
  protected readonly filtreStatut = signal<StatutTransaction | ''>('');
  protected readonly ouverte = linkedSignal<Onglet, string | null>({ source: this.onglet, computation: () => null });
  protected readonly enCours = signal<string | null>(null);

  protected readonly paiements = httpResource<PaiementEnAttente[]>(() =>
    this.onglet() === 'paiements' ? `${API_ADMIN}/paiements/en-attente` : undefined,
  );
  protected readonly transactions = httpResource<TransactionAdmin[]>(() => {
    switch (this.onglet()) {
      case 'litiges':
        return { url: `${API_ADMIN}/transactions/litiges` };
      case 'rembourser':
        return { url: `${API_ADMIN}/transactions/a-rembourser` };
      case 'verser':
        return { url: `${API_ADMIN}/transactions/a-verser` };
      case 'toutes':
        return { url: `${API_ADMIN}/transactions`, params: sansVides({ statut: this.filtreStatut(), taille: 100 }) };
      default:
        return undefined;
    }
  });
  protected readonly vide = computed(() => {
    switch (this.onglet()) {
      case 'litiges':
        return 'Aucun litige en cours';
      case 'rembourser':
        return 'Aucun remboursement à effectuer';
      case 'verser':
        return 'Aucun versement à effectuer';
      default:
        return 'Aucune transaction';
    }
  });

  constructor() {
    rechargerEnDirect(this.paiements);
    rechargerEnDirect(this.transactions);
  }

  protected erreur(e: unknown): string {
    return messageApi(e);
  }

  private recharger(): void {
    this.paiements.reload();
    this.transactions.reload();
  }

  protected confirmerPaiement(p: PaiementEnAttente, montant: number, operation: string): void {
    this.enCours.set(p.reference);
    this.api.confirmerPaiement(p.reference, montant, operation).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(`${p.reference} : paiement confirmé, les vendeurs sont prévenus.`);
        this.recharger();
      },
      error: (e) => {
        this.enCours.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }

  protected async trancher(t: TransactionAdmin, decision: DecisionLitige): Promise<void> {
    const acheteur = decision === 'EN_FAVEUR_ACHETEUR';
    const { ok, texte } = await this.confirmation.demander({
      titre: acheteur ? `Donner raison à ${t.acheteur.nom} ?` : `Donner raison à ${t.vendeur.nom} ?`,
      message: acheteur
        ? `La transaction ${t.reference} sera remboursée (${fcfa(t.montant)}).`
        : `La transaction ${t.reference} sera livrée et le vendeur payé (${fcfa(t.montantVendeur)}).`,
      confirmer: 'Trancher',
      danger: acheteur,
      champ: { libelle: 'Motif de la décision (communiqué aux deux parties)', obligatoire: true },
    });
    if (!ok) return;
    this.enCours.set(t.reference);
    this.api.trancherLitige(t.reference, decision, texte.trim()).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(`${t.reference} : litige tranché.`);
        this.recharger();
      },
      error: (e) => {
        this.enCours.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }

  protected async marquer(t: TransactionAdmin, remboursement: boolean): Promise<void> {
    const destinataire = remboursement ? t.acheteur : t.vendeur;
    const { ok, texte } = await this.confirmation.demander({
      titre: remboursement ? `Remboursement de ${t.reference}` : `Versement de ${t.reference}`,
      message: `${fcfa(remboursement ? t.montant : t.montantVendeur)} à ${destinataire.nom}${destinataire.telephone ? ` (${destinataire.telephone})` : ''}.`,
      confirmer: 'Enregistrer',
      champ: { libelle: "Référence de l'opération", obligatoire: true },
    });
    if (!ok) return;
    this.enCours.set(t.reference);
    const appel = remboursement
      ? this.api.marquerRembourse(t.reference, texte.trim())
      : this.api.marquerVerse(t.reference, texte.trim());
    appel.subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(remboursement ? 'Remboursement enregistré.' : 'Versement enregistré.');
        this.recharger();
      },
      error: (e) => {
        this.enCours.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
