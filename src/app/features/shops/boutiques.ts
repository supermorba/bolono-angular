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
import { RouterLink } from '@angular/router';
import { ShopsService } from './shops.service';
import { dateCourte, dateHeure, fcfa, mediaUrl, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { BoutiqueAdmin, BoutiqueAdminDetail, CompteursBoutiques, StatutBoutique } from './shops.model';
import type { Page } from '../../core/models/common.model';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Panneau } from '../../shared/dialogs/fenetres';
import { Icon } from '../../shared/icons/icon';
import {
  Badge,
  BarreChargement,
  ConfirmationService,
  EntetePage,
  EtatVide,
  Pagination,
  Squelette,
  type Ton,
} from '../../shared/components/ui';

const TAILLE_PAGE = 15;

export const STATUTS_BOUTIQUE: Record<StatutBoutique, { libelle: string; ton: Ton }> = {
  OUVERTE: { libelle: 'Ouverte', ton: 'succes' },
  FERMEE: { libelle: 'Fermée par le vendeur', ton: 'neutre' },
  MASQUEE: { libelle: 'Masquée', ton: 'erreur' },
};

const LIBELLES_VERSEMENT: Record<string, string> = { ORANGE_MONEY: 'Orange Money', WAVE: 'Wave' };

/** Logo de boutique, ou initiale sur fond sable. */
@Component({
  selector: 'app-logo-boutique',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  templateUrl: './logo-boutique.html',
})
export class LogoBoutique {
  readonly url = input<string | null>(null);
  readonly taille = input(40);
  protected readonly enErreur = signal(false);
  protected readonly src = computed(() => mediaUrl(this.url()));
}

/** Panneau latéral : fiche d'une boutique et modération (masquer / rétablir). */
@Component({
  selector: 'app-fiche-boutique',
  imports: [RouterLink, Icon, Badge, EtatVide, Squelette, Panneau, LogoBoutique],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fiche-boutique.html',
})
export class FicheBoutique {
  private readonly api = inject(ShopsService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly fcfa = fcfa;
  protected readonly nombre = nombre;
  protected readonly dateCourte = dateCourte;
  protected readonly dateHeure = dateHeure;
  protected readonly statuts = STATUTS_BOUTIQUE;
  protected readonly versement = LIBELLES_VERSEMENT;

  readonly id = input.required<number>();
  readonly fermer = output<void>();
  readonly modifie = output<void>();

  protected readonly fiche = httpResource<BoutiqueAdminDetail>(
    () => `${API_ADMIN}/boutiques/${this.id()}`,
  );
  protected readonly erreur = computed(() => messageApi(this.fiche.error()));
  protected readonly banniere = computed(() =>
    this.fiche.hasValue() ? mediaUrl(this.fiche.value().banniereUrl) : null,
  );
  protected readonly enCours = signal(false);

  protected async changerVisibilite(visible: boolean): Promise<void> {
    const b = this.fiche.value()!.boutique;
    const { ok, texte, notification } = await this.confirmation.demander(
      visible
        ? {
            titre: `Rétablir « ${b.nom} » ?`,
            message:
              'La boutique et ses produits en ligne redeviennent visibles dans l’application.',
            confirmer: 'Rétablir',
            notification: b.proprietaire,
          }
        : {
            titre: `Masquer « ${b.nom} » ?`,
            message:
              'La boutique et tous ses produits disparaissent de l’application. Le vendeur ne pourra pas la rouvrir lui-même.',
            confirmer: 'Masquer',
            danger: true,
            champ: { libelle: 'Motif (montré au vendeur)', obligatoire: true },
            notification: b.proprietaire,
          },
    );
    if (!ok) return;
    this.enCours.set(true);
    this.api.changerVisibiliteBoutique(b.id, visible, texte, notification).subscribe({
      next: (d) => {
        this.enCours.set(false);
        this.fiche.set(d);
        this.toast.succes(
          visible ? `« ${b.nom} » est de nouveau visible.` : `« ${b.nom} » a été masquée.`,
        );
        this.modifie.emit();
      },
      error: (e) => {
        this.enCours.set(false);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}

@Component({
  selector: 'app-boutiques',
  imports: [
    EntetePage,
    Icon,
    Badge,
    BarreChargement,
    EtatVide,
    Pagination,
    Squelette,
    FicheBoutique,
    LogoBoutique,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boutiques.html',
})
export class BoutiquesPage {
  protected readonly fcfa = fcfa;
  protected readonly nombre = nombre;
  protected readonly statuts = STATUTS_BOUTIQUE;
  protected readonly lignesSquelette = Array.from({ length: 6 }, (_, i) => i);

  /** Recherche (?q=) et lien direct vers une fiche (?id=). */
  readonly q = input<string>();
  readonly idFiche = input<string>(undefined, { alias: 'id' });

  protected readonly saisie = linkedSignal(() => this.q() ?? '');
  protected readonly recherche = linkedSignal(() => this.q() ?? '');
  protected readonly statut = signal<StatutBoutique | ''>('');
  protected readonly numero = linkedSignal(() => {
    this.recherche();
    this.statut();
    return 0;
  });
  protected readonly selection = linkedSignal<number | null>(() => {
    const id = Number(this.idFiche());
    return Number.isInteger(id) && id > 0 ? id : null;
  });

  protected readonly liste = httpResource<Page<BoutiqueAdmin>>(() => ({
    url: `${API_ADMIN}/boutiques`,
    params: sansVides({
      q: this.recherche().trim(),
      statut: this.statut(),
      page: this.numero(),
      size: TAILLE_PAGE,
    }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly compteurs = httpResource<CompteursBoutiques>(
    () => `${API_ADMIN}/boutiques/compteurs`,
  );
  protected readonly erreur = computed(() => messageApi(this.liste.error()));

  protected readonly onglets = computed(() => {
    const c = this.compteurs.hasValue() ? this.compteurs.value() : null;
    return [
      { valeur: '' as const, libelle: 'Toutes', compte: c?.toutes },
      { valeur: 'OUVERTE' as const, libelle: 'Ouvertes', compte: c?.ouvertes },
      { valeur: 'FERMEE' as const, libelle: 'Fermées', compte: c?.fermees },
      { valeur: 'MASQUEE' as const, libelle: 'Masquées', compte: c?.masquees },
    ];
  });

  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    rechargerEnDirect(this.liste);
    rechargerEnDirect(this.compteurs);
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected saisir(texte: string): void {
    this.saisie.set(texte);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recherche.set(texte), 300);
  }

  protected rafraichir(): void {
    this.liste.reload();
    this.compteurs.reload();
  }
}
