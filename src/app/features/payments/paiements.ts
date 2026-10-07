import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentsService } from './payments.service';
import { dateHeure, fcfa } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type {
  DecisionLitige,
  PaiementEnAttente,
  StatutTransaction,
  TransactionAdmin,
} from './payments.model';
import { API_ADMIN, rechargerEnDirect, sansVides } from '../../core/api/ressources';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';
import {
  Badge,
  BarreChargement,
  ConfirmationService,
  EtatVide,
  Squelette,
  EntetePage,
} from '../../shared/components/ui';
import {
  LIBELLES_ACTION_TRANSACTION,
  LIBELLES_FONDS,
  LIBELLES_PAIEMENT,
  LIBELLES_TRANSACTION,
  TON_TRANSACTION,
} from './payments.labels';

type Onglet = 'paiements' | 'litiges' | 'rembourser' | 'verser' | 'toutes';
const ONGLETS_VALIDES: Onglet[] = ['paiements', 'litiges', 'rembourser', 'verser', 'toutes'];

/** Détail d'une transaction : articles, parties, litige et journal (qui fait foi). */
@Component({
  selector: 'app-detail-transaction',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-transaction.html',
})
export class DetailTransaction {
  protected readonly fcfa = fcfa;
  protected readonly dateHeure = dateHeure;
  protected readonly libellesAction = LIBELLES_ACTION_TRANSACTION;
  readonly transaction = input.required<TransactionAdmin>();
  /** Les listes n'ont pas de journal : il est chargé avec le détail. */
  protected readonly detail = httpResource<TransactionAdmin>(
    () => `${API_ADMIN}/transactions/${this.transaction().reference}`,
  );
}

/** Confirmation de la réception d'un paiement : montant reçu et référence de l'opération. */
@Component({
  selector: 'app-confirmation-paiement',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmation-paiement.html',
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
  imports: [
    EntetePage,
    Icon,
    Badge,
    BarreChargement,
    EtatVide,
    Squelette,
    DetailTransaction,
    ConfirmationPaiement,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paiements.html',
})
export class PaiementsPage {
  private readonly api = inject(PaymentsService);
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
    {
      valeur: 'paiements',
      libelle: 'Paiements à confirmer',
      compte: () => this.notifications.compteurs()?.paiementsAConfirmer ?? 0,
    },
    {
      valeur: 'litiges',
      libelle: 'Litiges',
      compte: () => this.notifications.compteurs()?.litigesEnCours ?? 0,
    },
    {
      valeur: 'rembourser',
      libelle: 'À rembourser',
      compte: () => this.notifications.compteurs()?.remboursementsAEffectuer ?? 0,
    },
    {
      valeur: 'verser',
      libelle: 'À verser',
      compte: () => this.notifications.compteurs()?.versementsAEffectuer ?? 0,
    },
    { valeur: 'toutes', libelle: 'Toutes les transactions' },
  ];
  protected readonly statuts: { valeur: StatutTransaction | ''; libelle: string }[] = [
    { valeur: '', libelle: 'Toutes' },
    ...(Object.keys(LIBELLES_TRANSACTION) as StatutTransaction[]).map((s) => ({
      valeur: s,
      libelle: LIBELLES_TRANSACTION[s],
    })),
  ];

  /** Onglet ouvert depuis la cloche (?onglet=). */
  readonly ongletInitial = input<string>(undefined, { alias: 'onglet' });
  protected readonly onglet = linkedSignal<Onglet>(() => {
    const o = this.ongletInitial();
    return ONGLETS_VALIDES.includes(o as Onglet) ? (o as Onglet) : 'paiements';
  });
  protected readonly filtreStatut = signal<StatutTransaction | ''>('');
  protected readonly ouverte = linkedSignal<Onglet, string | null>({
    source: this.onglet,
    computation: () => null,
  });
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
        return {
          url: `${API_ADMIN}/transactions`,
          params: sansVides({ statut: this.filtreStatut(), taille: 100 }),
        };
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
      titre: acheteur
        ? `Donner raison à ${t.acheteur.nom} ?`
        : `Donner raison à ${t.vendeur.nom} ?`,
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
