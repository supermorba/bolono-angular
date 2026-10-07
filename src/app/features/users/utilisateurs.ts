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
import { UsersService } from './users.service';
import { LIBELLES_ROLE } from './users.labels';
import { dateCourte, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { CompteursUtilisateurs, UtilisateurAdmin } from './users.model';
import type { Page } from '../../core/models/common.model';
import { API_ADMIN, derniereValeur, sansVides } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';
import {
  Avatar,
  Badge,
  BarreChargement,
  EtatVide,
  Pagination,
  Squelette,
  type Ton,
  EntetePage,
} from '../../shared/components/ui';
import { FicheUtilisateur } from './fiche-utilisateur';

type Tri = { champ: 'dateInscription' | 'nom'; sens: 'asc' | 'desc' };

const TAILLE_PAGE = 15;

@Component({
  selector: 'app-utilisateurs',
  imports: [
    EntetePage,
    Icon,
    Avatar,
    Badge,
    BarreChargement,
    EtatVide,
    Pagination,
    Squelette,
    FicheUtilisateur,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './utilisateurs.html',
})
export class UtilisateursPage {
  private readonly api = inject(UsersService);
  private readonly toast = inject(ToastService);
  protected readonly dateCourte = dateCourte;
  protected readonly nombre = nombre;
  protected readonly lignesSquelette = Array.from({ length: 8 }, (_, i) => i);

  /** Pré-remplissage depuis la recherche globale (?q=). */
  readonly q = input<string>();
  /** Lien direct vers une fiche (?id=). */
  readonly idFiche = input<string>(undefined, { alias: 'id' });

  // ── État des filtres (signaux) ──────────────────────────────────────────
  /** Texte tapé (immédiat) et texte recherché (différé de 300 ms). */
  protected readonly saisie = linkedSignal(() => this.q() ?? '');
  protected readonly recherche = linkedSignal(() => this.q() ?? '');
  protected readonly role = signal('');
  protected readonly statut = signal<'' | 'SUSPENDU'>('');
  protected readonly tri = signal<Tri>({ champ: 'dateInscription', sens: 'desc' });
  /** Revient à la première page dès qu'un critère change. */
  protected readonly numero = linkedSignal(() => {
    this.recherche();
    this.role();
    this.statut();
    this.tri();
    return 0;
  });
  protected readonly selection = linkedSignal<number | null>(() => {
    const id = Number(this.idFiche());
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  protected readonly exportEnCours = signal(false);

  // ── Données (ressources réactives) ──────────────────────────────────────
  /** Relancée automatiquement à chaque changement de filtre, de tri ou de page. */
  protected readonly liste = httpResource<Page<UtilisateurAdmin>>(() => ({
    url: `${API_ADMIN}/utilisateurs`,
    params: sansVides({
      q: this.recherche().trim(),
      role: this.role(),
      statut: this.statut(),
      page: this.numero(),
      size: TAILLE_PAGE,
      sort: `${this.tri().champ},${this.tri().sens}`,
    }),
  }));
  /** Page affichée : la précédente reste visible pendant le chargement suivant. */
  protected readonly page = derniereValeur(this.liste);
  protected readonly compteurs = httpResource<CompteursUtilisateurs>(
    () => `${API_ADMIN}/utilisateurs/compteurs`,
  );

  protected readonly erreur = computed(() => messageApi(this.liste.error()));

  protected readonly onglets = computed(() => {
    const c = this.compteurs.hasValue() ? this.compteurs.value() : null;
    return [
      { valeur: '', libelle: 'Tous', compte: c?.tous },
      { valeur: 'ARTISAN', libelle: 'Artisans', compte: c?.artisans },
      { valeur: 'VENDEUR', libelle: 'Vendeurs', compte: c?.vendeurs },
      { valeur: 'MENTOR', libelle: 'Mentors', compte: c?.mentors },
      { valeur: 'ACHETEUR', libelle: 'Acheteurs', compte: c?.acheteurs },
      { valeur: 'ADMIN', libelle: 'Administrateurs', compte: c?.administrateurs },
    ];
  });

  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected saisir(texte: string): void {
    this.saisie.set(texte);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recherche.set(texte), 300);
  }

  protected filtrerRole(role: string): void {
    this.role.set(role);
  }

  protected basculerSuspendus(uniquement: boolean): void {
    this.statut.set(uniquement ? 'SUSPENDU' : '');
  }

  protected trier(champ: Tri['champ']): void {
    this.tri.update((t) =>
      t.champ === champ
        ? { champ, sens: t.sens === 'asc' ? 'desc' : 'asc' }
        : { champ, sens: champ === 'nom' ? 'asc' : 'desc' },
    );
  }

  protected iconeTri(champ: Tri['champ']): string {
    const t = this.tri();
    return t.champ !== champ ? 'caret-down' : t.sens === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  protected profil(u: UtilisateurAdmin): string {
    return u.role === 'ADMIN' ? 'Administrateur' : u.mentor ? 'Mentor' : LIBELLES_ROLE[u.role];
  }

  protected ton(u: UtilisateurAdmin): Ton {
    if (u.role === 'ADMIN') return 'neutre';
    return u.mentor ? 'accent' : u.role === 'ARTISAN' ? 'attention' : 'info';
  }

  /** Un compte a changé dans la fiche : liste et compteurs se mettent à jour. */
  protected rafraichir(): void {
    this.liste.reload();
    this.compteurs.reload();
  }

  protected apresSuppression(): void {
    this.selection.set(null);
    this.rafraichir();
  }

  protected exporter(): void {
    this.exportEnCours.set(true);
    this.api
      .exporterUtilisateurs({
        q: this.recherche().trim(),
        role: this.role(),
        statut: this.statut(),
      })
      .subscribe({
        next: (fichier) => {
          this.exportEnCours.set(false);
          const lien = document.createElement('a');
          lien.href = URL.createObjectURL(fichier);
          lien.download = `utilisateurs-bolono-${new Date().toISOString().slice(0, 10)}.csv`;
          lien.click();
          setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
        },
        error: (e) => {
          this.exportEnCours.set(false);
          this.toast.erreur(messageApi(e, "L'export a échoué."));
        },
      });
  }
}
