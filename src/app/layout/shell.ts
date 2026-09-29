import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, filter, of, switchMap, catchError } from 'rxjs';
import { AdminApi } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';
import { LIBELLES_ROLE, fcfa } from '../core/format';
import type { ResultatsRecherche } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { Icon } from '../shared/icon';
import { Avatar } from '../shared/ui';

interface EntreeMenu {
  libelle: string;
  icone: string;
  lien: string;
  compteur?: () => number;
}

/** Cadre du back-office : barre latérale, barre du haut et contenu. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-screen',
    '(document:click)': 'fermerMenus($event)',
    '(document:keydown.escape)': 'fermerTout()',
  },
  templateUrl: './shell.html',
})
export class Shell {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly hote = inject(ElementRef<HTMLElement>);
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationsService);
  protected readonly fcfa = fcfa;
  protected readonly libellesRole = LIBELLES_ROLE;
  /** Libellé court sur petit écran, où le champ est étroit. */
  protected readonly placeholderRecherche =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
      ? 'Rechercher…'
      : 'Rechercher un utilisateur, un produit, une formation…';

  protected readonly sections: { titre: string | null; entrees: EntreeMenu[] }[] = [
    { titre: null, entrees: [{ libelle: 'Tableau de bord', icone: 'house', lien: '/' }] },
    {
      titre: 'Communauté',
      entrees: [
        { libelle: 'Utilisateurs', icone: 'user', lien: '/utilisateurs' },
        {
          libelle: 'Mentorat',
          icone: 'users',
          lien: '/mentorat',
          compteur: () => this.notifications.compteurs()?.candidaturesEnAttente ?? 0,
        },
        { libelle: 'Publications', icone: 'chat-circle-text', lien: '/publications' },
        { libelle: 'Statuts', icone: 'circle-dashed', lien: '/statuts' },
        { libelle: 'Projets', icone: 'handshake', lien: '/projets' },
      ],
    },
    {
      titre: 'Boutique',
      entrees: [
        {
          libelle: 'Produits',
          icone: 'package',
          lien: '/produits',
          compteur: () => this.notifications.compteurs()?.produitsEnAttente ?? 0,
        },
        { libelle: 'Commandes', icone: 'shopping-cart', lien: '/commandes' },
      ],
    },
    {
      titre: 'Apprentissage',
      entrees: [
        { libelle: 'Formations', icone: 'play-circle', lien: '/formations' },
        { libelle: 'Badges', icone: 'medal', lien: '/badges' },
      ],
    },
    {
      titre: 'Communication',
      entrees: [
        { libelle: 'Annonces', icone: 'megaphone', lien: '/annonces' },
        {
          libelle: 'Signalements',
          icone: 'warning',
          lien: '/signalements',
          compteur: () => this.notifications.compteurs()?.publicationsSignalees ?? 0,
        },
        { libelle: 'Activité', icone: 'pulse', lien: '/activite' },
      ],
    },
    { titre: null, entrees: [{ libelle: 'Paramètres', icone: 'gear-six', lien: '/parametres' }] },
  ];

  protected readonly barreOuverte = signal(false);
  protected readonly menuCompte = signal(false);
  protected readonly menuNotifications = signal(false);

  // Recherche globale
  protected readonly recherche = signal('');
  protected readonly resultats = signal<ResultatsRecherche | null>(null);
  protected readonly rechercheEnCours = signal(false);
  protected readonly aucunResultat = computed(() => {
    const r = this.resultats();
    return !!r && !r.utilisateurs.length && !r.produits.length && !r.formations.length;
  });
  private readonly saisie$ = new Subject<string>();

  constructor() {
    this.notifications.demarrer();
    inject(DestroyRef).onDestroy(() => this.notifications.arreter());

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.fermerTout();
        this.notifications.rafraichir();
      });

    this.saisie$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 2) {
            this.rechercheEnCours.set(false);
            return of(null);
          }
          this.rechercheEnCours.set(true);
          return this.api.rechercher(q.trim()).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((r) => {
        this.rechercheEnCours.set(false);
        this.resultats.set(r);
      });
  }

  protected saisir(q: string): void {
    this.recherche.set(q);
    if (q.trim().length < 2) this.resultats.set(null);
    this.saisie$.next(q);
  }

  /** Ouvre la page concernée, filtrée sur l'élément trouvé (et sa fiche si [id]). */
  protected ouvrir(lien: string, q?: string, id?: number): void {
    this.recherche.set('');
    this.resultats.set(null);
    void this.router.navigate([lien], { queryParams: { ...(q ? { q } : {}), ...(id ? { id } : {}) } });
  }

  protected async deconnexion(): Promise<void> {
    await this.auth.deconnexion();
    await this.router.navigate(['/connexion']);
  }

  protected fermerMenus(evenement: MouseEvent): void {
    const cible = evenement.target as HTMLElement;
    if (!cible.closest('[data-menu="compte"]')) this.menuCompte.set(false);
    if (!cible.closest('[data-menu="notifications"]')) this.menuNotifications.set(false);
    if (!cible.closest('[data-menu="recherche"]')) this.resultats.set(null);
    if (!this.hote.nativeElement.contains(cible)) this.barreOuverte.set(false);
  }

  protected fermerTout(): void {
    this.menuCompte.set(false);
    this.menuNotifications.set(false);
    this.resultats.set(null);
    this.barreOuverte.set(false);
  }
}
