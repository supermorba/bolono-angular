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
import { ProductsService } from './products.service';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../../core/api/ressources';
import { FicheProduit, LIBELLES_TYPE_PRODUIT } from './fiche-produit';
import { dateCourte, fcfa, mediaUrl, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { Page } from '../../core/models/common.model';
import type { ProduitAdmin, StatutProduit } from './products.model';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';
import {
  Badge,
  ConfirmationService,
  EtatVide,
  Pagination,
  Squelette,
  type Ton,
  EntetePage,
} from '../../shared/components/ui';

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
  templateUrl: './produits.html',
})
export class ProduitsPage {
  private readonly api = inject(ProductsService);
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
    params: sansVides({
      q: this.recherche().trim(),
      statut: this.statut(),
      page: this.numero(),
      size: 12,
    }),
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
            message:
              'Le produit ne sera plus visible par les acheteurs. Vous pourrez le remettre en ligne à tout moment.',
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
        this.toast.succes(
          visible
            ? `« ${produit.nom} » est de nouveau en ligne.`
            : `« ${produit.nom} » a été masqué de la boutique.`,
        );
        this.liste.reload();
      },
      error: (e) => {
        this.enCours.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
