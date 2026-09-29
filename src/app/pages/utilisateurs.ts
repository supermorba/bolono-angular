import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { AdminApi } from '../core/admin-api.service';
import { LIBELLES_ROLE, dateCourte, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { CompteursUtilisateurs, Page, UtilisateurAdmin } from '../core/models';
import { API_ADMIN, derniereValeur, sansVides } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Avatar, Badge, BarreChargement, EtatVide, Pagination, Squelette, type Ton } from '../shared/ui';
import { FicheUtilisateur } from './fiche-utilisateur';

type Tri = { champ: 'dateInscription' | 'nom'; sens: 'asc' | 'desc' };

const TAILLE_PAGE = 15;

@Component({
  selector: 'app-utilisateurs',
  imports: [Icon, Avatar, Badge, BarreChargement, EtatVide, Pagination, Squelette, FicheUtilisateur],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold">Utilisateurs</h1>
        <p class="mt-1 text-sm text-muted-strong">
          @if (compteurs.hasValue()) {
            {{ nombre(compteurs.value().tous) }} comptes inscrits sur Bolono
            @if (compteurs.value().suspendus) {
              · {{ nombre(compteurs.value().suspendus) }} suspendu{{ compteurs.value().suspendus > 1 ? 's' : '' }}
            }
          } @else {
            Artisans, mentors, acheteurs et administrateurs inscrits sur Bolono.
          }
        </p>
      </div>
      <button class="btn-outline btn-sm" [disabled]="exportEnCours()" (click)="exporter()">
        @if (exportEnCours()) {
          <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-terracotta"></span> Export…
        } @else {
          <app-icon name="download-simple" [size]="16" /> Exporter (CSV)
        }
      </button>
    </div>

    <div class="card relative p-4 sm:p-5">
      <app-barre-chargement [actif]="liste.isLoading() && !!page()" />

      <!-- Filtres -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="onglets" role="tablist" aria-label="Profil">
          @for (o of onglets(); track o.valeur) {
            <button
              class="onglet"
              [class.onglet-actif]="role() === o.valeur"
              role="tab"
              [attr.aria-selected]="role() === o.valeur"
              (click)="filtrerRole(o.valeur)"
            >
              {{ o.libelle }}
              <span class="rounded-full bg-sand/60 px-1.5 text-2xs leading-4 text-brown">{{ o.compte ?? '…' }}</span>
            </button>
          }
        </div>
        <label class="flex items-center gap-2 text-xs font-semibold text-muted-strong">
          <input type="checkbox" class="h-4 w-4 accent-terracotta" [checked]="statut() === 'SUSPENDU'" (change)="basculerSuspendus($any($event.target).checked)" />
          Suspendus uniquement
        </label>
        <div class="relative w-full sm:ml-auto sm:max-w-xs">
          <app-icon name="magnifying-glass" [size]="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="search"
            class="input py-2! pl-9!"
            placeholder="Nom, e-mail ou téléphone"
            [value]="saisie()"
            (input)="saisir($any($event.target).value)"
            aria-label="Rechercher un utilisateur"
          />
        </div>
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
                  <th>
                    <button class="inline-flex items-center gap-1 uppercase hover:text-brown" (click)="trier('nom')">
                      Utilisateur <app-icon [name]="iconeTri('nom')" [size]="11" />
                    </button>
                  </th>
                  <th>Profil</th>
                  <th class="hidden md:table-cell">Spécialité / ville</th>
                  <th class="hidden xl:table-cell">Téléphone</th>
                  <th class="hidden sm:table-cell">
                    <button class="inline-flex items-center gap-1 uppercase hover:text-brown" (click)="trier('dateInscription')">
                      Inscription <app-icon [name]="iconeTri('dateInscription')" [size]="11" />
                    </button>
                  </th>
                  <th class="hidden sm:table-cell">Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (u of p.content; track u.id) {
                  <tr
                    class="cursor-pointer"
                    [class.bg-terracotta-light!]="selection() === u.id"
                    (click)="selection.set(u.id)"
                    (keydown.enter)="selection.set(u.id)"
                    tabindex="0"
                  >
                    <td>
                      <div class="flex max-w-56 items-center gap-3 sm:max-w-none" [class.opacity-60]="u.suspendu">
                        <app-avatar [photo]="u.photoUrl" [nom]="u.nom" [size]="36" />
                        <div class="min-w-0">
                          <p class="truncate font-semibold">{{ u.nom }}</p>
                          <p class="truncate text-xs text-muted">{{ u.email }}</p>
                          @if (u.suspendu) {
                            <p class="text-2xs font-semibold text-error sm:hidden">Suspendu</p>
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="flex flex-wrap gap-1">
                        <app-badge [ton]="ton(u)">{{ profil(u) }}</app-badge>
                        @if (u.role === 'ADMIN' && u.mentor) {
                          <app-badge ton="accent">Mentor</app-badge>
                        }
                      </div>
                    </td>
                    <td class="hidden text-muted-strong md:table-cell">{{ u.specialite || u.ville || '—' }}</td>
                    <td class="hidden whitespace-nowrap text-muted-strong xl:table-cell">{{ u.telephone || '—' }}</td>
                    <td class="hidden whitespace-nowrap text-muted-strong sm:table-cell">{{ dateCourte(u.dateInscription) }}</td>
                    <td class="hidden sm:table-cell">
                      @if (u.suspendu) {
                        <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-error"><span class="h-1.5 w-1.5 rounded-full bg-error"></span>Suspendu</span>
                      } @else {
                        <span class="inline-flex items-center gap-1.5 text-xs text-muted-strong"><span class="h-1.5 w-1.5 rounded-full bg-success"></span>Actif</span>
                      }
                    </td>
                    <td class="text-right"><app-icon name="caret-right" [size]="16" class="text-muted" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination [page]="p.number" [pages]="p.totalPages" [total]="p.totalElements" (changer)="numero.set($event)" />
        } @else {
          <app-etat-vide
            icone="users"
            titre="Aucun utilisateur"
            [message]="recherche() ? 'Aucun compte ne correspond à « ' + recherche() + ' ».' : 'Aucun compte ne correspond à ces critères.'"
          />
        }
      } @else {
        @for (i of lignesSquelette; track i) {
          <app-squelette class="my-2" [hauteur]="44" />
        }
      }
    </div>

    @if (selection(); as id) {
      <app-fiche-utilisateur [id]="id" (fermer)="selection.set(null)" (modifie)="rafraichir()" (supprime)="apresSuppression()" />
    }
  `,
})
export class UtilisateursPage {
  private readonly api = inject(AdminApi);
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
  protected readonly compteurs = httpResource<CompteursUtilisateurs>(() => `${API_ADMIN}/utilisateurs/compteurs`);

  protected readonly erreur = computed(() => messageApi(this.liste.error()));

  protected readonly onglets = computed(() => {
    const c = this.compteurs.hasValue() ? this.compteurs.value() : null;
    return [
      { valeur: '', libelle: 'Tous', compte: c?.tous },
      { valeur: 'ARTISAN', libelle: 'Artisans', compte: c?.artisans },
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
      t.champ === champ ? { champ, sens: t.sens === 'asc' ? 'desc' : 'asc' } : { champ, sens: champ === 'nom' ? 'asc' : 'desc' },
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
      .exporterUtilisateurs({ q: this.recherche().trim(), role: this.role(), statut: this.statut() })
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
