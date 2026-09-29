import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Subscription } from 'rxjs';
import { dateHeure, ilYa } from '../core/format';
import { messageApi } from '../core/http';
import type { Activite, PageActivites, TypeActivite } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { API_ADMIN, sansVides } from '../core/ressources';
import { Icon } from '../shared/icon';
import { EtatVide, Squelette } from '../shared/ui';
import { STYLE_ACTIVITE, cheminLien, parametresLien } from '../shared/activite';

const FILTRES: { valeur: TypeActivite | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tout' },
  { valeur: 'COMMANDE', libelle: 'Commandes' },
  { valeur: 'PRODUIT', libelle: 'Produits' },
  { valeur: 'INSCRIPTION', libelle: 'Inscriptions' },
  { valeur: 'FORMATION', libelle: 'Formations' },
  { valeur: 'COMPLETION', libelle: 'Formations terminées' },
  { valeur: 'MENTORAT', libelle: 'Mentorat' },
];

/** Journal complet de l'activité de la plateforme, chargé par pages successives. */
@Component({
  selector: 'app-activite',
  imports: [RouterLink, Icon, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <h1 class="text-2xl font-extrabold">Activité</h1>
      <p class="mt-1 text-sm text-muted-strong">Tout ce qui se passe sur Bolono, du plus récent au plus ancien.</p>
    </div>

    <div class="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-card p-1 sm:w-fit">
      @for (f of filtres; track f.valeur) {
        <button class="onglet" [class.onglet-actif]="type() === f.valeur" (click)="type.set(f.valeur)">{{ f.libelle }}</button>
      }
    </div>

    <section class="card p-4 sm:p-5">
      @if (erreur() && !elements().length) {
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()!">
          <button class="btn-accent btn-sm mt-2" (click)="charger(true)">Réessayer</button>
        </app-etat-vide>
      } @else if (elements().length) {
        <ol class="relative ml-5 border-l border-line">
          @for (a of elements(); track $index) {
            <li class="relative pb-1 pl-7">
              <span class="absolute top-2.5 -left-5 flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-surface" [class]="styles[a.type].classes">
                <app-icon [name]="styles[a.type].icone" [size]="18" />
              </span>
              <a [routerLink]="cheminLien(a.lien)" [queryParams]="parametresLien(a.lien)" class="block rounded-lg px-3 py-3 transition hover:bg-ivory">
                <span class="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span class="text-ms font-semibold">{{ a.titre }}</span>
                  <span class="text-2xs text-muted" [title]="dateHeure(a.date)">{{ ilYa(a.date) }}</span>
                </span>
                <span class="block text-xs text-muted-strong">{{ a.detail }}</span>
              </a>
            </li>
          }
        </ol>
        @if (suivante()) {
          <div class="mt-4 flex justify-center">
            <button class="btn-outline btn-sm" [disabled]="chargement()" (click)="charger(false)">
              @if (chargement()) {
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-terracotta"></span>
              }
              Afficher plus
            </button>
          </div>
        } @else {
          <p class="mt-4 text-center text-xs text-muted">Début de l'historique.</p>
        }
      } @else if (chargement()) {
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <app-squelette class="my-3" [hauteur]="48" />
        }
      } @else {
        <app-etat-vide icone="pulse" titre="Aucune activité" message="Rien à afficher pour ce filtre." />
      }
    </section>
  `,
})
export class ActivitePage {
  private readonly http = inject(HttpClient);
  protected readonly styles = STYLE_ACTIVITE;
  protected readonly filtres = FILTRES;
  protected readonly ilYa = ilYa;
  protected readonly dateHeure = dateHeure;
  protected readonly cheminLien = cheminLien;
  protected readonly parametresLien = parametresLien;

  protected readonly type = signal<TypeActivite | ''>('');
  protected readonly elements = signal<Activite[]>([]);
  protected readonly suivante = signal(false);
  protected readonly chargement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  private page = 0;
  private requete: Subscription | null = null;

  constructor() {
    // Nouveau filtre : on repart de la première page.
    effect(() => {
      this.type();
      this.elements.set([]);
      this.charger(true);
    });
    // Événement temps réel : la première page est rechargée.
    const notifications = inject(NotificationsService);
    let premier = true;
    effect(() => {
      notifications.revision();
      if (premier) {
        premier = false;
        return;
      }
      this.charger(true);
    });
    inject(DestroyRef).onDestroy(() => this.requete?.unsubscribe());
  }

  protected charger(depuisDebut: boolean): void {
    this.requete?.unsubscribe();
    const page = depuisDebut ? 0 : this.page + 1;
    this.chargement.set(true);
    this.erreur.set(null);
    this.requete = this.http
      .get<PageActivites>(`${API_ADMIN}/activites`, { params: sansVides({ type: this.type(), page, size: 25 }) })
      .subscribe({
        next: (r) => {
          this.page = page;
          this.elements.update((liste) => (depuisDebut ? r.contenu : [...liste, ...r.contenu]));
          this.suivante.set(r.suivante);
          this.chargement.set(false);
        },
        error: (e) => {
          this.chargement.set(false);
          this.erreur.set(messageApi(e));
        },
      });
  }
}
