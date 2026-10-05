import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { AdminApi } from '../core/admin-api.service';
import { dateHeure, ilYa, mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { Page, StatutMentorAdmin } from '../core/models';
import { API_ADMIN, derniereValeur, sansVides } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Avatar, ConfirmationService, EtatVide, Pagination, EntetePage } from '../shared/ui';

/** Statuts éphémères (24 h) publiés par les mentors. */
@Component({
  selector: 'app-statuts',
  imports: [EntetePage, Icon, Avatar, EtatVide, Pagination],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'apercu.set(null)' },
  template: `
    <app-entete-page titre="Statuts" [chargement]="liste.isLoading() && !!page()">
    </app-entete-page>

    <div class="onglets mb-5 sm:w-fit">
      <button class="onglet" [class.onglet-actif]="actifs()" (click)="actifs.set(true)">En ligne</button>
      <button class="onglet" [class.onglet-actif]="!actifs()" (click)="actifs.set(false)">Historique complet</button>
    </div>

    @if (liste.error() && !page()) {
      <div class="card">
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="liste.reload()">Réessayer</button>
        </app-etat-vide>
      </div>
    } @else if (page(); as p) {
      @if (p.content.length) {
        <div class="grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-6" [class.opacity-60]="liste.isLoading()">
          @for (s of p.content; track s.id) {
            <article class="group relative aspect-9/16 overflow-hidden rounded-2xl bg-brown shadow-card" [class.opacity-55]="!s.actif">
              <button class="absolute inset-0 block h-full w-full" (click)="apercu.set(s)" [attr.aria-label]="'Voir le statut de ' + (s.auteur?.nom ?? 'mentor')">
                @if (s.type === 'VIDEO') {
                  <video [src]="mediaUrl(s.mediaUrl) + '#t=0.5'" preload="metadata" muted class="h-full w-full object-cover"></video>
                  <span class="absolute top-2.5 right-2.5 rounded-full bg-black/55 p-1.5 text-white"><app-icon name="play-circle" weight="fill" [size]="16" /></span>
                } @else {
                  <img [src]="mediaUrl(s.mediaUrl)" alt="" class="h-full w-full object-cover" loading="lazy" />
                }
              </button>
              <div class="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/60 to-transparent p-2.5">
                <app-avatar [photo]="s.auteur?.photoUrl" [nom]="s.auteur?.nom" [size]="28" />
                <div class="min-w-0 text-white">
                  <p class="truncate text-xs font-semibold">{{ s.auteur?.nom ?? 'Compte supprimé' }}</p>
                  <p class="text-2xs text-white/75">{{ ilYa(s.dateCreation) }}</p>
                </div>
              </div>
              <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent p-2.5 pt-8 text-white">
                @if (s.legende) {
                  <p class="line-clamp-2 text-xs">{{ s.legende }}</p>
                }
                <p class="mt-1 flex items-center justify-between text-2xs text-white/80">
                  <span class="inline-flex items-center gap-1"><app-icon name="eye" [size]="12" /> {{ nombre(s.vues) }}</span>
                  <span>{{ s.actif ? 'En ligne' : 'Expiré' }}</span>
                </p>
              </div>
              <button
                class="absolute right-2 bottom-12 rounded-full bg-error p-2 text-white opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
                [disabled]="suppression() === s.id"
                (click)="supprimer(s)"
                aria-label="Supprimer le statut"
              >
                <app-icon name="trash" [size]="15" />
              </button>
            </article>
          }
        </div>
        <app-pagination [page]="p.number" [pages]="p.totalPages" [total]="p.totalElements" (changer)="numero.set($event)" />
      } @else {
        <div class="card">
          <app-etat-vide
            icone="circle-dashed"
            [titre]="actifs() ? 'Aucun statut en ligne' : 'Aucun statut'"
            message="Les statuts publiés par les mentors apparaîtront ici."
          />
        </div>
      }
    } @else {
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-6">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div class="aspect-9/16 animate-pulse rounded-2xl bg-card/80"></div>
        }
      </div>
    }

    <!-- Visionneuse -->
    @if (apercu(); as s) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 transition-opacity starting:opacity-0" (click)="apercu.set(null)">
        <div class="relative flex h-full max-h-[90dvh] w-full max-w-md flex-col" (click)="$event.stopPropagation()">
          <div class="mb-3 flex items-center gap-3 text-white">
            <app-avatar [photo]="s.auteur?.photoUrl" [nom]="s.auteur?.nom" [size]="36" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{{ s.auteur?.nom ?? 'Compte supprimé' }}</p>
              <p class="text-xs text-white/70">{{ dateHeure(s.dateCreation) }} · {{ nombre(s.vues) }} vue{{ s.vues > 1 ? 's' : '' }}</p>
            </div>
            <button class="rounded-full p-2 hover:bg-white/10" (click)="apercu.set(null)" aria-label="Fermer"><app-icon name="x" [size]="22" /></button>
          </div>
          <div class="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black">
            @if (s.type === 'VIDEO') {
              <video [src]="mediaUrl(s.mediaUrl)" controls autoplay class="max-h-full max-w-full object-contain"></video>
            } @else {
              <img [src]="mediaUrl(s.mediaUrl)" alt="" class="max-h-full max-w-full object-contain" />
            }
          </div>
          @if (s.legende) {
            <p class="mt-3 text-center text-sm text-white">{{ s.legende }}</p>
          }
          <button class="btn-danger mx-auto mt-4" (click)="supprimer(s)"><app-icon name="trash" [size]="16" /> Supprimer ce statut</button>
        </div>
      </div>
    }
  `,
})
export class StatutsPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly mediaUrl = mediaUrl;
  protected readonly ilYa = ilYa;
  protected readonly dateHeure = dateHeure;
  protected readonly nombre = nombre;

  protected readonly actifs = signal(true);
  protected readonly numero = linkedSignal(() => {
    this.actifs();
    return 0;
  });
  protected readonly liste = httpResource<Page<StatutMentorAdmin>>(() => ({
    url: `${API_ADMIN}/statuts`,
    params: sansVides({ actifs: String(this.actifs()), page: this.numero(), size: 24 }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly apercu = signal<StatutMentorAdmin | null>(null);
  protected readonly suppression = signal<number | null>(null);

  protected async supprimer(s: StatutMentorAdmin): Promise<void> {
    const { ok, notification } = await this.confirmation.demander({
      titre: 'Supprimer ce statut ?',
      message: `Le statut de ${s.auteur?.nom ?? 'ce mentor'} et ses ${s.vues} vue(s) seront supprimés.`,
      confirmer: 'Supprimer',
      danger: true,
      notification: s.auteur?.nom ?? 'le mentor',
    });
    if (!ok) return;
    this.suppression.set(s.id);
    this.api.supprimerStatut(s.id, notification).subscribe({
      next: () => {
        this.suppression.set(null);
        this.apercu.set(null);
        this.toast.succes('Statut supprimé.');
        this.liste.reload();
      },
      error: (e) => {
        this.suppression.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
