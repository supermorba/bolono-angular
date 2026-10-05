import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { AdminApi } from '../core/admin-api.service';
import { dateCourte, dateHeure, fcfa, ilYa, mediaUrl } from '../core/format';
import { messageApi } from '../core/http';
import type { Page, ProjetAdmin, ProjetDetailAdmin, StatutProjet } from '../core/models';
import { API_ADMIN, derniereValeur, sansVides } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Panneau } from '../shared/fenetres';
import { Icon } from '../shared/icon';
import { Avatar, Badge, ConfirmationService, EtatVide, Pagination, Squelette, type Ton, EntetePage } from '../shared/ui';

const STATUTS: Record<StatutProjet, { libelle: string; ton: Ton }> = {
  OUVERT: { libelle: 'Ouvert', ton: 'info' },
  TERMINE: { libelle: 'Terminé', ton: 'succes' },
  ANNULE: { libelle: 'Annulé', ton: 'neutre' },
};

const TON_PARTICIPATION: Record<string, { libelle: string; ton: Ton }> = {
  EN_ATTENTE: { libelle: 'En attente', ton: 'attention' },
  ACCEPTE: { libelle: 'Accepté', ton: 'succes' },
  REFUSE: { libelle: 'Refusé', ton: 'erreur' },
};

/** Fiche d'un projet collaboratif : description, participants et statut. */
@Component({
  selector: 'app-fiche-projet',
  imports: [Panneau, Icon, Avatar, Badge, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-panneau titre="Projet collaboratif" largeur="max-w-xl" (fermer)="fermer.emit()">
      @if (fiche.error() && !fiche.hasValue()) {
        <app-etat-vide icone="warning" titre="Projet indisponible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="fiche.reload()">Réessayer</button>
        </app-etat-vide>
      } @else if (fiche.hasValue()) {
        @let d = fiche.value();
        @let p = d.projet;
        @if (d.photos.length) {
          <div class="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
            @for (photo of d.photos; track photo) {
              <img [src]="mediaUrl(photo)" alt="" class="h-40 w-64 shrink-0 snap-start rounded-xl object-cover" />
            }
          </div>
        }
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <app-badge [ton]="statuts[p.statut].ton">{{ statuts[p.statut].libelle }}</app-badge>
          @for (m of p.metiers; track m) {
            <app-badge>{{ m }}</app-badge>
          }
        </div>
        <h3 class="mt-2 text-xl font-bold">{{ p.titre }}</h3>
        <p class="mt-2 text-sm whitespace-pre-line text-muted-strong">{{ p.description }}</p>
        @if (d.audioUrl) {
          <audio [src]="mediaUrl(d.audioUrl)" controls preload="none" class="mt-3 h-9 w-full"></audio>
        }

        <dl class="mt-5 grid grid-cols-2 gap-3 text-ms">
          @for (
            l of [
              { l: 'Budget', v: fcfa(p.budget) },
              { l: 'Lieu', v: lieu(d) },
              { l: 'Artisans', v: p.participants + ' / ' + p.artisansRequis },
              { l: 'Candidatures jusqu’au', v: dateCourte(p.dateLimiteCandidature) },
            ];
            track l.l
          ) {
            <div class="rounded-xl bg-ochre-surface px-3 py-2.5">
              <dt class="text-2xs text-muted-strong">{{ l.l }}</dt>
              <dd class="font-semibold">{{ l.v }}</dd>
            </div>
          }
        </dl>

        <h4 class="mt-6 mb-2 font-bold">Initiateur</h4>
        <div class="flex items-center gap-3">
          <app-avatar [photo]="p.initiateur?.photoUrl" [nom]="p.initiateur?.nom" [size]="36" />
          <div>
            <p class="font-semibold">{{ p.initiateur?.nom ?? 'Compte supprimé' }}</p>
            <p class="text-xs text-muted">Projet créé le {{ dateHeure(p.dateCreation) }}</p>
          </div>
        </div>

        <h4 class="mt-6 mb-2 font-bold">Participations ({{ d.participations.length }})</h4>
        <ul class="flex flex-col gap-2">
          @for (pa of d.participations; track pa.id) {
            <li class="flex gap-3 rounded-xl border border-line p-3">
              <app-avatar [photo]="pa.artisan?.photoUrl" [nom]="pa.artisan?.nom" [size]="32" />
              <div class="min-w-0 flex-1">
                <p class="flex flex-wrap items-center gap-2 text-ms">
                  <b>{{ pa.artisan?.nom ?? 'Compte supprimé' }}</b>
                  @if (pa.statut; as st) {
                    <app-badge [ton]="participations[st].ton">{{ participations[st].libelle }}</app-badge>
                  }
                </p>
                <p class="text-xs text-muted">{{ pa.role ? pa.role + ' · ' : '' }}{{ ilYa(pa.dateDemande) }}</p>
                @if (pa.message) {
                  <p class="mt-1 text-xs text-muted-strong italic">« {{ pa.message }} »</p>
                }
              </div>
            </li>
          } @empty {
            <li class="text-xs text-muted">Aucune candidature pour le moment.</li>
          }
        </ul>
      } @else {
        <app-squelette [hauteur]="160" />
        <app-squelette class="mt-4" [hauteur]="24" />
        <app-squelette class="mt-2" [hauteur]="120" />
      }

      <div pied class="flex flex-wrap items-center gap-2 border-t border-line bg-ivory/60 px-5 py-4 sm:px-6">
        @if (fiche.hasValue()) {
          <label class="flex flex-1 items-center gap-2 text-xs font-semibold text-muted-strong">
            Statut
            <select class="input py-2!" [value]="fiche.value().projet.statut" [disabled]="enCours()" (change)="changerStatut($any($event.target))">
              @for (s of ordreStatuts; track s) {
                <option [value]="s">{{ statuts[s].libelle }}</option>
              }
            </select>
          </label>
          <button class="btn-outline text-error!" [disabled]="enCours()" (click)="supprimer()"><app-icon name="trash" [size]="16" /> Supprimer</button>
        }
      </div>
    </app-panneau>
  `,
})
export class FicheProjet {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly mediaUrl = mediaUrl;
  protected readonly fcfa = fcfa;
  protected readonly dateCourte = dateCourte;
  protected readonly dateHeure = dateHeure;
  protected readonly ilYa = ilYa;
  protected readonly statuts = STATUTS;
  protected readonly participations = TON_PARTICIPATION;
  protected readonly ordreStatuts = Object.keys(STATUTS) as StatutProjet[];

  readonly id = input.required<number>();
  readonly fermer = output<void>();
  readonly modifie = output<void>();

  protected readonly fiche = httpResource<ProjetDetailAdmin>(() => `${API_ADMIN}/projets/${this.id()}`);
  protected readonly erreur = computed(() => messageApi(this.fiche.error()));
  protected readonly enCours = signal(false);

  protected lieu(d: ProjetDetailAdmin): string {
    return [d.communeOuQuartier, d.projet.ville].filter((x) => !!x).join(', ') || '—';
  }

  protected async changerStatut(champ: HTMLSelectElement): Promise<void> {
    const projet = this.fiche.value()!.projet;
    const statut = champ.value as StatutProjet;
    const { ok, notification } = await this.confirmation.demander({
      titre: `Passer le projet au statut « ${STATUTS[statut].libelle} » ?`,
      message: `« ${projet.titre} » sera affiché avec ce statut dans l'application.`,
      confirmer: 'Changer le statut',
      danger: statut === 'ANNULE',
      notification: projet.initiateur?.nom ?? "l'initiateur",
    });
    if (!ok) {
      champ.value = projet.statut;
      return;
    }
    this.enCours.set(true);
    this.api.changerStatutProjet(this.id(), statut, notification).subscribe({
      next: (projet) => {
        this.enCours.set(false);
        this.fiche.value.update((d) => (d ? { ...d, projet } : d));
        this.toast.succes(`Projet passé à « ${STATUTS[statut].libelle} ».`);
        this.modifie.emit();
      },
      error: (e) => {
        this.enCours.set(false);
        this.fiche.reload();
        this.toast.erreur(messageApi(e));
      },
    });
  }

  protected async supprimer(): Promise<void> {
    const p = this.fiche.value()!.projet;
    const { ok, notification } = await this.confirmation.demander({
      titre: `Supprimer « ${p.titre} » ?`,
      message: 'Le projet et toutes ses candidatures seront supprimés définitivement.',
      confirmer: 'Supprimer',
      danger: true,
      notification: p.initiateur?.nom ?? "l'initiateur",
    });
    if (!ok) return;
    this.enCours.set(true);
    this.api.supprimerProjet(p.id, notification).subscribe({
      next: () => {
        this.toast.succes('Projet supprimé.');
        this.modifie.emit();
        this.fermer.emit();
      },
      error: (e) => {
        this.enCours.set(false);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}

@Component({
  selector: 'app-projets',
  imports: [EntetePage, Icon, Avatar, Badge, EtatVide, Pagination, Squelette, FicheProjet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-entete-page titre="Projets collaboratifs" [chargement]="liste.isLoading() && !!page()">
    </app-entete-page>

    <div class="card mb-5 flex flex-wrap items-center gap-3 p-3 sm:p-4">
      <div class="flex gap-1 overflow-x-auto rounded-xl bg-card p-1">
        <button class="onglet" [class.onglet-actif]="!statut()" (click)="statut.set('')">Tous</button>
        @for (s of ordreStatuts; track s) {
          <button class="onglet" [class.onglet-actif]="statut() === s" (click)="statut.set(s)">{{ statuts[s].libelle }}</button>
        }
      </div>
      <div class="relative w-full sm:ml-auto sm:max-w-xs">
        <app-icon name="magnifying-glass" [size]="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input type="search" class="input py-2! pl-9!" placeholder="Titre, ville, initiateur" [value]="saisie()" (input)="rechercher($any($event.target).value)" />
      </div>
    </div>

    @if (liste.error() && !page()) {
      <div class="card">
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="liste.reload()">Réessayer</button>
        </app-etat-vide>
      </div>
    } @else if (page(); as p) {
      @if (p.content.length) {
        <div class="grid grid-cols-1 items-start gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3" [class.opacity-60]="liste.isLoading()">
          @for (pr of p.content; track pr.id) {
            <button class="card card-cliquable flex flex-col overflow-hidden text-left" (click)="selection.set(pr.id)">
              @if (mediaUrl(pr.photo); as src) {
                <img [src]="src" alt="" class="aspect-video w-full object-cover" loading="lazy" />
              } @else {
                <div class="flex aspect-video w-full items-center justify-center bg-ochre-surface text-sand-deep"><app-icon name="handshake" [size]="42" /></div>
              }
              <div class="flex flex-1 flex-col p-4">
                <div class="flex items-center justify-between gap-2">
                  <app-badge [ton]="statuts[pr.statut].ton">{{ statuts[pr.statut].libelle }}</app-badge>
                  @if (pr.candidaturesEnAttente) {
                    <span class="text-2xs font-semibold text-warning">{{ pr.candidaturesEnAttente }} candidature{{ pr.candidaturesEnAttente > 1 ? 's' : '' }} en attente</span>
                  }
                </div>
                <h2 class="mt-2 line-clamp-2 font-bold">{{ pr.titre }}</h2>
                <p class="mt-1 line-clamp-2 text-sm text-muted-strong">{{ pr.description }}</p>
                <div class="mt-auto pt-3">
                  <div class="flex items-center justify-between text-xs text-muted-strong">
                    <span>{{ pr.participants }} / {{ pr.artisansRequis }} artisans</span>
                    <span class="font-semibold text-brown">{{ fcfa(pr.budget) }}</span>
                  </div>
                  <span class="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-card">
                    <span class="block h-full rounded-full bg-terracotta" [style.width.%]="progression(pr)"></span>
                  </span>
                  <div class="mt-3 flex items-center gap-2 border-t border-line pt-3">
                    <app-avatar [photo]="pr.initiateur?.photoUrl" [nom]="pr.initiateur?.nom" [size]="24" />
                    <span class="flex-1 truncate text-xs">{{ pr.initiateur?.nom ?? 'Compte supprimé' }}</span>
                    <span class="text-2xs text-muted">{{ pr.ville ?? '' }}</span>
                  </div>
                </div>
              </div>
            </button>
          }
        </div>
        <app-pagination [page]="p.number" [pages]="p.totalPages" [total]="p.totalElements" (changer)="numero.set($event)" />
      } @else {
        <div class="card">
          <app-etat-vide icone="handshake" titre="Aucun projet" message="Aucun projet ne correspond à ces filtres." />
        </div>
      }
    } @else {
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        @for (i of [1, 2, 3]; track i) {
          <app-squelette [hauteur]="320" />
        }
      </div>
    }

    @if (selection(); as id) {
      <app-fiche-projet [id]="id" (fermer)="selection.set(null)" (modifie)="liste.reload()" />
    }
  `,
})
export class ProjetsPage {
  protected readonly mediaUrl = mediaUrl;
  protected readonly fcfa = fcfa;
  protected readonly statuts = STATUTS;
  protected readonly ordreStatuts = Object.keys(STATUTS) as StatutProjet[];

  protected readonly statut = signal('');
  protected readonly saisie = signal('');
  protected readonly recherche = signal('');
  protected readonly numero = linkedSignal(() => {
    this.statut();
    this.recherche();
    return 0;
  });
  protected readonly liste = httpResource<Page<ProjetAdmin>>(() => ({
    url: `${API_ADMIN}/projets`,
    params: sansVides({ page: this.numero(), size: 12, statut: this.statut(), q: this.recherche().trim() }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly selection = signal<number | null>(null);
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected rechercher(q: string): void {
    this.saisie.set(q);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recherche.set(q), 300);
  }

  protected progression(p: ProjetAdmin): number {
    return p.artisansRequis ? Math.min(100, Math.round((p.participants / p.artisansRequis) * 100)) : 0;
  }
}
