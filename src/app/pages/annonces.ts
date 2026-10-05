import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../core/admin-api.service';
import { dateHeure, ilYa, mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { AnnonceAdmin, AudienceAnnonce, Page, PrioriteAnnonce } from '../core/models';
import { API_ADMIN, derniereValeur, sansVides } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Televersement } from '../shared/fenetres';
import { Icon } from '../shared/icon';
import { Badge, ConfirmationService, EtatVide, Pagination, Squelette, EntetePage } from '../shared/ui';

const AUDIENCES: Record<AudienceAnnonce, { libelle: string; icone: string }> = {
  TOUS: { libelle: 'Tout le monde', icone: 'users-three' },
  ARTISANS: { libelle: 'Artisans', icone: 'hand-heart' },
  MENTORS: { libelle: 'Mentors', icone: 'chalkboard-teacher' },
  ACHETEURS: { libelle: 'Acheteurs', icone: 'shopping-cart' },
};

/** Composition, diffusion (temps réel + push) et historique des annonces. */
@Component({
  selector: 'app-annonces',
  imports: [EntetePage, FormsModule, Icon, Badge, EtatVide, Pagination, Squelette, Televersement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-entete-page titre="Annonces">
    </app-entete-page>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <!-- Composition -->
      <form class="card p-4 sm:p-5" (submit)="$event.preventDefault(); publier()">
        <h2 class="card-title mb-4">Nouvelle annonce</h2>

        <p class="mb-2 text-xs font-semibold text-muted-strong">Destinataires</p>
        <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
          @for (a of ordreAudiences; track a) {
            <button
              type="button"
              class="flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-semibold transition"
              [class]="audience() === a ? 'border-terracotta bg-terracotta-light text-terracotta' : 'border-line text-muted-strong hover:border-sand-deep'"
              [attr.aria-pressed]="audience() === a"
              (click)="audience.set(a)"
            >
              <app-icon [name]="audiences[a].icone" [size]="22" [weight]="audience() === a ? 'fill' : 'regular'" />
              {{ audiences[a].libelle }}
            </button>
          }
        </div>
        <p class="mt-2 flex items-center gap-1.5 text-xs text-muted-strong">
          <app-icon name="broadcast" [size]="14" />
          @if (portee.hasValue()) {
            Environ <b class="text-brown">{{ nombre(portee.value().utilisateurs) }}</b> utilisateur{{ portee.value().utilisateurs > 1 ? 's' : '' }} actif{{ portee.value().utilisateurs > 1 ? 's' : '' }} concerné{{ portee.value().utilisateurs > 1 ? 's' : '' }}
          } @else {
            Calcul de l'audience…
          }
        </p>

        <div class="mt-5 space-y-3.5">
          <label class="block text-xs font-semibold text-muted-strong">
            Titre <span class="font-normal text-muted">({{ modele.titre.length }}/120)</span>
            <input class="input mt-1" name="titre" [(ngModel)]="modele.titre" required maxlength="120" placeholder="Nouvelle formation disponible" />
          </label>
          <label class="block text-xs font-semibold text-muted-strong">
            Message <span class="font-normal text-muted">({{ modele.message.length }}/2000)</span>
            <textarea class="input mt-1 min-h-32" name="message" [(ngModel)]="modele.message" required maxlength="2000"></textarea>
          </label>
          <div class="grid gap-3.5 md:grid-cols-2">
            <label class="block text-xs font-semibold text-muted-strong">
              Lien (facultatif)
              <input class="input mt-1" name="lien" type="url" [(ngModel)]="modele.lien" maxlength="500" placeholder="https://…" />
            </label>
            <label class="block text-xs font-semibold text-muted-strong">
              Expire le (facultatif)
              <input class="input mt-1" name="expiration" type="datetime-local" [min]="maintenant" [(ngModel)]="modele.dateExpiration" />
            </label>
          </div>
          <div>
            <p class="mb-1.5 text-xs font-semibold text-muted-strong">Image (facultative)</p>
            <app-televersement categorie="ANNONCE_IMAGE" [(url)]="modele.imageUrl" hauteurVide="h-24" />
          </div>
          <div class="flex flex-wrap gap-x-6 gap-y-2.5 rounded-xl bg-ochre-surface px-4 py-3">
            <label class="flex items-center gap-2 text-ms">
              <input type="checkbox" class="h-4 w-4 accent-terracotta" name="important" [ngModel]="priorite() === 'IMPORTANT'" (ngModelChange)="priorite.set($event ? 'IMPORTANT' : 'INFO')" />
              Importante <span class="text-xs text-muted">(mise en avant)</span>
            </label>
            <label class="flex items-center gap-2 text-ms">
              <input type="checkbox" class="h-4 w-4 accent-terracotta" name="push" [(ngModel)]="modele.envoyerPush" />
              Envoyer aussi une notification push
            </label>
          </div>
        </div>

        <div class="mt-5 flex justify-end">
          <button class="btn-accent" type="submit" [disabled]="publication()">
            @if (publication()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
            } @else {
              <app-icon name="megaphone" [size]="18" />
            }
            Publier l'annonce
          </button>
        </div>
      </form>

      <!-- Aperçu téléphone -->
      <aside>
        <p class="mb-2 text-xs font-semibold text-muted-strong">Aperçu dans l'application</p>
        <div class="mx-auto max-w-[340px] rounded-[2rem] border-[6px] border-brown bg-ivory p-3 shadow-card">
          <div class="mb-3 flex items-center justify-between px-1 text-2xs font-semibold text-muted-strong">
            <span>Bolono</span><app-icon name="bell" [size]="14" />
          </div>
          <div class="overflow-hidden rounded-2xl bg-surface shadow-card" [class]="priorite() === 'IMPORTANT' ? 'ring-2 ring-terracotta' : ''">
            @if (mediaUrl(modele.imageUrl); as src) {
              <img [src]="src" alt="" class="aspect-video w-full object-cover" />
            }
            <div class="p-3.5">
              <p class="flex items-center gap-1.5 text-2xs font-bold tracking-wide uppercase" [class]="priorite() === 'IMPORTANT' ? 'text-terracotta' : 'text-info'">
                <app-icon name="megaphone" weight="fill" [size]="12" /> {{ priorite() === 'IMPORTANT' ? 'Annonce importante' : 'Annonce' }}
              </p>
              <p class="mt-1 font-bold break-words">{{ modele.titre || 'Titre de l’annonce' }}</p>
              <p class="mt-1 line-clamp-5 text-xs break-words whitespace-pre-line text-muted-strong">{{ modele.message || 'Le message apparaîtra ici.' }}</p>
              @if (modele.lien) {
                <p class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-terracotta"><app-icon name="link-simple" [size]="13" /> En savoir plus</p>
              }
            </div>
          </div>
          @if (modele.envoyerPush) {
            <div class="mt-3 flex gap-2.5 rounded-xl bg-brown/90 p-2.5 text-white">
              <img src="images/bolono-logo.svg" alt="" class="h-7 w-7" />
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold">{{ modele.titre || 'Titre de l’annonce' }}</p>
                <p class="line-clamp-2 text-2xs text-white/80">{{ modele.message || 'Message' }}</p>
              </div>
            </div>
          }
        </div>
      </aside>
    </div>

    <!-- Historique -->
    <section class="card mt-5 p-4 sm:p-5">
      <h2 class="card-title mb-4 flex items-center gap-3">
        Annonces publiées
        @if (historique.isLoading() && page()) {
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-terracotta"></span>
        }
      </h2>
      @if (historique.error() && !page()) {
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="historique.reload()">Réessayer</button>
        </app-etat-vide>
      } @else if (page(); as p) {
        @if (p.content.length) {
          <ul class="flex flex-col gap-3">
            @for (a of p.content; track a.id) {
              <li class="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row" [class.opacity-60]="!a.active">
                @if (mediaUrl(a.imageUrl); as src) {
                  <img [src]="src" alt="" class="h-24 w-full shrink-0 rounded-lg object-cover sm:w-36" loading="lazy" />
                }
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    @if (a.retiree) {
                      <app-badge ton="neutre">Retirée</app-badge>
                    } @else if (!a.active) {
                      <app-badge ton="neutre">Expirée</app-badge>
                    } @else {
                      <app-badge ton="succes">En ligne</app-badge>
                    }
                    @if (a.priorite === 'IMPORTANT') {
                      <app-badge ton="accent">Importante</app-badge>
                    }
                    <app-badge ton="info">{{ audiences[a.audience].libelle }}</app-badge>
                  </div>
                  <p class="mt-2 font-bold">{{ a.titre }}</p>
                  <p class="mt-0.5 line-clamp-2 text-sm text-muted-strong">{{ a.message }}</p>
                  <p class="mt-2 text-xs text-muted">
                    <span [title]="dateHeure(a.datePublication)">{{ ilYa(a.datePublication) }}</span>
                    {{ a.auteur ? ' · par ' + a.auteur : '' }}
                    @if (a.dateExpiration) {
                      · expire le {{ dateHeure(a.dateExpiration) }}
                    }
                  </p>
                </div>
                <div class="flex shrink-0 flex-row items-center gap-4 sm:w-48 sm:flex-col sm:items-stretch sm:gap-2">
                  <div class="flex-1 sm:flex-none">
                    <p class="text-2xs text-muted-strong">Lue par</p>
                    <p class="font-bold">{{ nombre(a.lectures) }} <span class="text-xs font-normal text-muted">/ {{ nombre(a.audienceTotale) }}</span></p>
                    <span class="mt-1 block h-1.5 overflow-hidden rounded-full bg-card">
                      <span class="block h-full rounded-full bg-chart-vert" [style.width.%]="taux(a)"></span>
                    </span>
                  </div>
                  <p class="flex-1 text-xs text-muted-strong sm:flex-none">
                    @if (!a.envoyerPush) {
                      Sans notification push
                    } @else if (a.pushEnvoyes === null) {
                      Notifications en cours d'envoi…
                    } @else {
                      {{ nombre(a.pushEnvoyes) }} notification{{ a.pushEnvoyes > 1 ? 's' : '' }} envoyée{{ a.pushEnvoyes > 1 ? 's' : '' }}
                    }
                  </p>
                  @if (a.active) {
                    <button class="btn-outline btn-sm text-error!" [disabled]="retrait() === a.id" (click)="retirer(a)">
                      <app-icon name="x-circle" [size]="15" /> Retirer
                    </button>
                  }
                </div>
              </li>
            }
          </ul>
          <app-pagination [page]="p.number" [pages]="p.totalPages" [total]="p.totalElements" (changer)="numero.set($event)" />
        } @else {
          <app-etat-vide icone="megaphone" titre="Aucune annonce" message="Les annonces publiées apparaîtront ici avec leurs statistiques de lecture." />
        }
      } @else {
        @for (i of [1, 2, 3]; track i) {
          <app-squelette class="mb-3" [hauteur]="110" />
        }
      }
    </section>
  `,
})
export class AnnoncesPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly mediaUrl = mediaUrl;
  protected readonly nombre = nombre;
  protected readonly ilYa = ilYa;
  protected readonly dateHeure = dateHeure;
  protected readonly audiences = AUDIENCES;
  protected readonly ordreAudiences = Object.keys(AUDIENCES) as AudienceAnnonce[];
  /** Valeur minimale du champ d'expiration (heure locale, format datetime-local). */
  protected readonly maintenant = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  protected readonly audience = signal<AudienceAnnonce>('TOUS');
  protected readonly priorite = signal<PrioriteAnnonce>('INFO');
  protected modele = {
    titre: '',
    message: '',
    lien: '',
    imageUrl: null as string | null,
    dateExpiration: '',
    envoyerPush: true,
  };
  protected readonly publication = signal(false);
  protected readonly retrait = signal<number | null>(null);

  protected readonly portee = httpResource<{ utilisateurs: number }>(() => ({
    url: `${API_ADMIN}/annonces/portee`,
    params: { audience: this.audience() },
  }));
  protected readonly numero = signal(0);
  protected readonly historique = httpResource<Page<AnnonceAdmin>>(() => ({
    url: `${API_ADMIN}/annonces`,
    params: sansVides({ page: this.numero(), size: 10 }),
  }));
  protected readonly page = derniereValeur(this.historique);
  protected readonly erreur = computed(() => messageApi(this.historique.error()));
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected taux(a: AnnonceAdmin): number {
    return a.audienceTotale ? Math.min(100, Math.round((a.lectures / a.audienceTotale) * 100)) : 0;
  }

  protected async publier(): Promise<void> {
    const m = this.modele;
    if (!m.titre.trim() || !m.message.trim()) {
      this.toast.erreur('Le titre et le message sont obligatoires.');
      return;
    }
    const cible = this.portee.hasValue() ? nombre(this.portee.value().utilisateurs) + ' utilisateur(s)' : 'les utilisateurs visés';
    const { ok } = await this.confirmation.demander({
      titre: 'Publier cette annonce ?',
      message: `Elle sera diffusée immédiatement à ${cible} (${AUDIENCES[this.audience()].libelle.toLowerCase()})${m.envoyerPush ? ', avec une notification push' : ''}.`,
      confirmer: 'Publier',
    });
    if (!ok) return;
    this.publication.set(true);
    this.api
      .publierAnnonce({
        titre: m.titre.trim(),
        message: m.message.trim(),
        lien: m.lien.trim() || null,
        imageUrl: m.imageUrl,
        audience: this.audience(),
        priorite: this.priorite(),
        dateExpiration: m.dateExpiration ? m.dateExpiration + ':00' : null,
        envoyerPush: m.envoyerPush,
      })
      .subscribe({
        next: (a) => {
          this.publication.set(false);
          this.toast.succes('Annonce publiée.');
          this.modele = { titre: '', message: '', lien: '', imageUrl: null, dateExpiration: '', envoyerPush: true };
          this.priorite.set('INFO');
          this.numero.set(0);
          this.historique.reload();
          // Les push partent en arrière-plan : on relit le bilan d'envoi un peu plus tard.
          if (a.envoyerPush) {
            clearTimeout(this.minuterie);
            this.minuterie = setTimeout(() => this.historique.reload(), 6000);
          }
        },
        error: (e) => {
          this.publication.set(false);
          this.toast.erreur(messageApi(e));
        },
      });
  }

  protected async retirer(a: AnnonceAdmin): Promise<void> {
    const { ok } = await this.confirmation.demander({
      titre: 'Retirer cette annonce ?',
      message: `« ${a.titre} » disparaîtra immédiatement des applications.`,
      confirmer: 'Retirer',
      danger: true,
    });
    if (!ok) return;
    this.retrait.set(a.id);
    this.api.retirerAnnonce(a.id).subscribe({
      next: () => {
        this.retrait.set(null);
        this.toast.succes('Annonce retirée.');
        this.historique.reload();
      },
      error: (e) => {
        this.retrait.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
