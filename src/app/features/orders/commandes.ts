import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrdersService } from './orders.service';
import { dateHeure, fcfa } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { CommandeAdmin, StatutCommande, StatutLivraison } from './orders.model';
import type { Page } from '../../core/models/common.model';
import type { StatutTransaction, TransactionAdmin } from '../payments/payments.model';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../../core/api/ressources';
import { enregistrerFichier } from '../../core/api/telechargement';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';
import {
  Badge,
  BarreChargement,
  EtatVide,
  Pagination,
  Squelette,
  type Ton,
  EntetePage,
} from '../../shared/components/ui';
import { LIBELLES_COMMANDE, LIBELLES_LIVRAISON, TON_COMMANDE } from './orders.labels';
import {
  LIBELLES_FONDS,
  LIBELLES_PAIEMENT,
  LIBELLES_TRANSACTION,
  TON_TRANSACTION,
} from '../payments/payments.labels';

/**
 * Détail déplié d'une commande, en lecture seule : chaque vendeur gère sa
 * part (une transaction sécurisée par vendeur). L'équipe intervient depuis
 * « Paiements et litiges ».
 */
@Component({
  selector: 'app-detail-commande',
  imports: [Icon, Badge, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-commande.html',
})
export class DetailCommande {
  protected readonly fcfa = fcfa;
  protected readonly libellesTransaction = LIBELLES_TRANSACTION;
  protected readonly libellesFonds = LIBELLES_FONDS;
  protected readonly tonsTransaction = TON_TRANSACTION;

  readonly commande = input.required<CommandeAdmin>();
  protected readonly colis = httpResource<TransactionAdmin[]>(
    () => `${API_ADMIN}/transactions/commande/${this.commande().id}`,
  );
}

@Component({
  selector: 'app-commandes',
  imports: [
    EntetePage,
    FormsModule,
    Icon,
    Badge,
    BarreChargement,
    EtatVide,
    Pagination,
    Squelette,
    DetailCommande,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './commandes.html',
})
export class CommandesPage {
  private readonly api = inject(OrdersService);
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
      .exporterCommandes(
        sansVides({
          statut: this.statut(),
          q: this.recherche().trim(),
          du: this.du(),
          au: this.au(),
        }),
      )
      .subscribe({
        next: (fichier) => {
          this.exportEnCours.set(false);
          enregistrerFichier(
            fichier,
            `commandes-bolono-${new Date().toISOString().slice(0, 10)}.csv`,
          );
        },
        error: (e) => {
          this.exportEnCours.set(false);
          this.toast.erreur(messageApi(e, "L'export a échoué."));
        },
      });
  }
}
