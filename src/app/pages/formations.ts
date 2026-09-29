import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AdminApi } from '../core/admin-api.service';
import { API_ADMIN, derniereValeur, sansVides } from '../core/ressources';
import { dateCourte, mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { FormationStat } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { ConfirmationService, EtatVide, Squelette } from '../shared/ui';

type Tri = 'apprenants' | 'tauxCompletion' | 'dateCreation';

@Component({
  selector: 'app-formations',
  imports: [RouterLink, Icon, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
      <h1 class="flex items-center gap-3 text-2xl font-extrabold">
        Formations
        @if (liste.isLoading() && page()) {
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-terracotta" aria-label="Mise à jour"></span>
        }
      </h1>
      <p class="mt-1 text-sm text-muted-strong">Suivi des formations publiées par les mentors : apprenants et taux de complétion.</p>
      </div>
      <a routerLink="/formations/nouvelle" class="btn-accent"><app-icon name="play-circle" [size]="18" /> Nouvelle formation</a>
    </div>

    <!-- Synthèse -->
    <div class="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
      @for (s of synthese(); track s.libelle) {
        <div class="card flex items-center gap-4 p-5">
          <span class="flex h-12 w-12 items-center justify-center rounded-full" [class]="s.classes"><app-icon [name]="s.icone" [size]="24" /></span>
          <div>
            <p class="text-ms text-muted-strong">{{ s.libelle }}</p>
            <p class="text-2xl font-extrabold">{{ s.valeur }}</p>
          </div>
        </div>
      }
    </div>

    <div class="card p-4 sm:p-5">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-xs text-muted-strong">
          Trier par
          <select class="input w-auto! py-1.5! text-xs!" [value]="tri()" (change)="tri.set($any($event.target).value)">
            <option value="apprenants">Apprenants</option>
            <option value="tauxCompletion">Taux de complétion</option>
            <option value="dateCreation">Date de publication</option>
          </select>
        </label>
        <div class="relative w-full sm:ml-auto sm:max-w-xs">
          <app-icon name="magnifying-glass" [size]="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input type="search" class="input py-2! pl-9!" placeholder="Titre, catégorie" [value]="saisie()" (input)="rechercher($any($event.target).value)" />
        </div>
      </div>

      @if (liste.error() && !page()) {
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="liste.reload()">Réessayer</button>
        </app-etat-vide>
      } @else if (formations(); as formationsChargees) {
        @if (formationsChargees.length) {
          <div class="overflow-x-auto transition-opacity" [class.opacity-60]="liste.isLoading()">
            <table class="table">
              <thead>
                <tr>
                  <th>Formation</th><th class="hidden lg:table-cell">Mentor</th><th class="hidden text-right md:table-cell">Modules</th>
                  <th class="hidden text-right sm:table-cell">Apprenants</th>
                  <th class="w-32 sm:w-48">Complétion</th><th class="hidden xl:table-cell">Publiée le</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (f of triees(); track f.id) {
                  <tr class="cursor-pointer" (click)="ouvrir(f.id)">
                    <td>
                      <div class="flex items-center gap-3">
                        @if (mediaUrl(f.miniature); as src) {
                          <img [src]="src" alt="" class="hidden h-11 w-16 rounded-lg object-cover sm:block" loading="lazy" />
                        } @else {
                          <span class="hidden h-11 w-16 items-center justify-center rounded-lg bg-info-surface text-info sm:flex"><app-icon name="play-circle" [size]="20" /></span>
                        }
                        <div class="max-w-40 min-w-0 sm:max-w-none">
                          <p class="truncate font-semibold" [title]="f.titre">{{ f.titre }}</p>
                          <p class="text-xs text-muted">{{ f.categorie }}{{ f.niveau ? ' · ' + f.niveau : '' }}</p>
                          <p class="text-2xs text-muted sm:hidden">{{ nombre(f.apprenants) }} apprenant{{ f.apprenants > 1 ? 's' : '' }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="hidden text-muted-strong lg:table-cell">{{ f.auteur ?? '—' }}</td>
                    <td class="hidden text-right md:table-cell">{{ f.modules }}</td>
                    <td class="hidden text-right font-semibold sm:table-cell">{{ nombre(f.apprenants) }}</td>
                    <td>
                      <div class="flex items-center gap-2">
                        <span class="w-10 text-xs font-semibold">{{ f.tauxCompletion }}%</span>
                        <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-card">
                          <span class="block h-full rounded-full bg-chart-vert" [style.width.%]="f.tauxCompletion"></span>
                        </span>
                      </div>
                      <p class="mt-0.5 text-2xs text-muted">{{ f.termines }} terminée{{ f.termines > 1 ? 's' : '' }}</p>
                    </td>
                    <td class="hidden whitespace-nowrap text-muted-strong xl:table-cell">{{ dateCourte(f.dateCreation) }}</td>
                    <td class="text-right">
                      <button class="rounded-lg p-2 text-muted transition hover:bg-error-surface hover:text-error" (click)="$event.stopPropagation(); supprimer(f)" aria-label="Supprimer la formation">
                        <app-icon name="trash" [size]="18" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-etat-vide icone="graduation-cap" titre="Aucune formation" message="Les formations publiées par les mentors apparaîtront ici." />
        }
      } @else {
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <app-squelette class="my-2" [hauteur]="52" />
        }
      }
    </div>
  `,
})
export class FormationsPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  protected readonly nombre = nombre;
  protected readonly dateCourte = dateCourte;
  protected readonly mediaUrl = mediaUrl;

  readonly q = input<string>();

  protected readonly saisie = linkedSignal(() => this.q() ?? '');
  protected readonly recherche = linkedSignal(() => this.q() ?? '');
  protected readonly tri = signal<Tri>('apprenants');

  /** Relancée à chaque nouvelle recherche. */
  protected readonly liste = httpResource<FormationStat[]>(() => ({
    url: `${API_ADMIN}/formations`,
    params: sansVides({ q: this.recherche().trim() }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly formations = this.page;
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  protected ouvrir(id: number): void {
    void this.router.navigate(['/formations', id]);
  }

  protected readonly triees = computed(() => {
    const cle = this.tri();
    return [...(this.formations() ?? [])].sort((a, b) =>
      cle === 'dateCreation'
        ? (b.dateCreation ?? '').localeCompare(a.dateCreation ?? '')
        : (b[cle] as number) - (a[cle] as number),
    );
  });

  protected readonly synthese = computed(() => {
    const liste = this.formations() ?? [];
    const apprenants = liste.reduce((s, f) => s + f.apprenants, 0);
    const termines = liste.reduce((s, f) => s + f.termines, 0);
    return [
      { libelle: 'Formations publiées', valeur: nombre(liste.length), icone: 'graduation-cap', classes: 'bg-info-surface text-info' },
      { libelle: 'Inscriptions aux formations', valeur: nombre(apprenants), icone: 'users', classes: 'bg-terracotta-light text-terracotta' },
      {
        libelle: 'Complétion moyenne',
        valeur: apprenants ? `${Math.round((termines / apprenants) * 100)}%` : '—',
        icone: 'check-circle',
        classes: 'bg-success-surface text-success',
      },
    ];
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected rechercher(q: string): void {
    this.saisie.set(q);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recherche.set(q), 300);
  }

  protected async supprimer(f: FormationStat): Promise<void> {
    const { ok, notification } = await this.confirmation.demander({
      titre: `Supprimer « ${f.titre} » ?`,
      message: `La formation, ses ${f.modules} module(s) et la progression de ses ${f.apprenants} apprenant(s) seront supprimés définitivement.`,
      confirmer: 'Supprimer',
      danger: true,
      notification: f.auteur,
    });
    if (!ok) return;
    this.api.supprimerFormation(f.id, notification).subscribe({
      next: () => {
        this.toast.succes(`« ${f.titre} » a été supprimée.`);
        this.liste.reload();
      },
      error: (e) => this.toast.erreur(messageApi(e, 'Suppression impossible.')),
    });
  }
}
