import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { AdminApi } from '../core/admin-api.service';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../core/ressources';
import { dateHeure, mediaUrl } from '../core/format';
import { messageApi } from '../core/http';
import type { OptionsNotification, Page, SignalementAdmin, SignalementDetail, StatutPublication } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Badge, ConfirmationService, EtatVide, Pagination, Squelette, type Ton, EntetePage } from '../shared/ui';

const STATUTS: Record<StatutPublication, { libelle: string; ton: Ton }> = {
  PUBLIEE: { libelle: 'Visible', ton: 'succes' },
  SIGNALEE: { libelle: 'Masquée automatiquement', ton: 'erreur' },
  MASQUEE: { libelle: 'Masquée', ton: 'neutre' },
  ARCHIVEE: { libelle: 'Archivée', ton: 'neutre' },
};

/** Détail des signalements d'une publication, chargé à l'ouverture. */
@Component({
  selector: 'app-detail-signalements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (details.isLoading()) {
      <p class="py-2 text-xs text-muted">Chargement…</p>
    } @else if (details.error()) {
      <p class="py-2 text-xs text-error">Détail indisponible.</p>
    } @else {
      <ul class="divide-y divide-line rounded-xl border border-line bg-ivory">
        @for (d of details.value(); track $index) {
          <li class="px-3.5 py-2.5 text-ms">
            <p><b>{{ d.auteur }}</b> <span class="text-muted">· {{ dateHeure(d.date) }}</span></p>
            <p class="text-muted-strong">Motif : {{ d.motif }}</p>
            @if (d.details) {
              <p class="mt-0.5 text-xs text-muted italic">« {{ d.details }} »</p>
            }
          </li>
        } @empty {
          <li class="px-3.5 py-2.5 text-xs text-muted">Signalements antérieurs à l'enregistrement des motifs : aucun détail disponible.</li>
        }
      </ul>
    }
  `,
})
export class DetailSignalements {
  protected readonly dateHeure = dateHeure;
  readonly publicationId = input.required<number>();
  protected readonly details = httpResource<SignalementDetail[]>(
    () => `${API_ADMIN}/signalements/${this.publicationId()}/details`,
    { defaultValue: [] },
  );
}

@Component({
  selector: 'app-signalements',
  imports: [EntetePage, Icon, Badge, EtatVide, Pagination, Squelette, DetailSignalements],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-entete-page titre="Signalements" [chargement]="liste.isLoading() && !!page()">
      Masquage automatique à partir de 3 signalements, en attendant votre décision.
    </app-entete-page>

    @if (liste.error() && !page()) {
      <div class="card">
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="liste.reload()">Réessayer</button>
        </app-etat-vide>
      </div>
    } @else if (page(); as p) {
      @if (p.content.length) {
        <div class="flex flex-col gap-4 transition-opacity" [class.opacity-60]="liste.isLoading()">
          @for (s of p.content; track s.publicationId) {
            <article class="card flex flex-col gap-4 p-4 sm:p-5 md:flex-row">
              @if (mediaUrl(s.media); as src) {
                <img [src]="src" alt="" class="h-32 w-full shrink-0 rounded-xl object-cover md:w-44" loading="lazy" />
              }
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center gap-1 rounded-sm bg-error-surface px-2.5 py-0.5 text-2xs font-bold text-error">
                    <app-icon name="flag" weight="fill" [size]="12" /> {{ s.nbSignalements }} signalement{{ s.nbSignalements > 1 ? 's' : '' }}
                  </span>
                  <app-badge [ton]="statuts[s.statut].ton">{{ statuts[s.statut].libelle }}</app-badge>
                </div>
                <h2 class="mt-2 font-bold">{{ s.titre || 'Publication sans titre' }}</h2>
                <p class="mt-1 text-sm text-muted-strong">{{ s.extrait || '—' }}</p>
                <p class="mt-2 text-xs text-muted">Par {{ s.auteur ?? 'auteur inconnu' }} · publiée le {{ dateHeure(s.datePublication) }}</p>
                @if (s.motifs.length) {
                  <div class="mt-2.5 flex flex-wrap gap-1.5">
                    @for (m of s.motifs; track m.motif) {
                      <span class="rounded-sm bg-error-surface px-2.5 py-0.5 text-2xs font-semibold text-error">{{ m.motif }} ×{{ m.nombre }}</span>
                    }
                  </div>
                }
                <button class="link-accent mt-2.5" (click)="detailOuvert.set(detailOuvert() === s.publicationId ? null : s.publicationId)">
                  {{ detailOuvert() === s.publicationId ? 'Masquer le détail' : 'Voir le détail des signalements' }}
                </button>
                @if (detailOuvert() === s.publicationId) {
                  <app-detail-signalements class="mt-2 block" [publicationId]="s.publicationId" />
                }
              </div>
              <div class="flex shrink-0 flex-row gap-2 md:w-44 md:flex-col md:justify-center">
                @if (s.statut !== 'PUBLIEE') {
                  <button class="btn-outline btn-sm flex-1 md:flex-none" [disabled]="enCours() === s.publicationId" (click)="moderer(s, 'PUBLIEE')">
                    <app-icon name="eye" [size]="15" /> Rétablir
                  </button>
                } @else {
                  <button class="btn-outline btn-sm flex-1 md:flex-none" [disabled]="enCours() === s.publicationId" (click)="moderer(s, 'PUBLIEE')">
                    <app-icon name="check" [size]="15" /> Ignorer
                  </button>
                }
                @if (s.statut !== 'MASQUEE') {
                  <button class="btn-danger btn-sm flex-1 md:flex-none" [disabled]="enCours() === s.publicationId" (click)="moderer(s, 'MASQUEE')">
                    <app-icon name="eye-slash" [size]="15" /> Masquer
                  </button>
                }
              </div>
            </article>
          }
        </div>
        <app-pagination [page]="p.number" [pages]="p.totalPages" [total]="p.totalElements" (changer)="numero.set($event)" />
      } @else {
        <div class="card">
          <app-etat-vide icone="check-circle" titre="Aucun signalement" message="La communauté n'a signalé aucune publication." />
        </div>
      }
    } @else {
      @for (i of [1, 2, 3]; track i) {
        <app-squelette class="mb-4" [hauteur]="150" />
      }
    }
  `,
})
export class SignalementsPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationsService);
  protected readonly dateHeure = dateHeure;
  protected readonly mediaUrl = mediaUrl;
  protected readonly statuts = STATUTS;

  /** Revient à la première page quand le filtre change. */
  protected readonly numero = linkedSignal(() => {
    return 0;
  });
  protected readonly liste = httpResource<Page<SignalementAdmin>>(() => ({
    url: `${API_ADMIN}/signalements`,
    params: sansVides({ page: this.numero(), size: 12 }),
  }));
  /** Page affichée : la précédente reste visible pendant le chargement suivant. */
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly enCours = signal<number | null>(null);
  protected readonly detailOuvert = signal<number | null>(null);

  constructor() {
    rechargerEnDirect(this.liste);
  }

  protected async moderer(s: SignalementAdmin, statut: 'PUBLIEE' | 'MASQUEE'): Promise<void> {
    // « Ignorer » (publication restée visible) ne change rien pour l'auteur : pas de notification.
    const auteurConcerne = s.statut !== statut;
    let notification: OptionsNotification | undefined;
    if (statut === 'MASQUEE' || auteurConcerne) {
      const reponse = await this.confirmation.demander(
        statut === 'MASQUEE'
          ? {
              titre: 'Masquer cette publication ?',
              message: "Elle ne sera plus visible dans le fil d'actualité. Vous pourrez la rétablir plus tard.",
              confirmer: 'Masquer',
              danger: true,
              notification: s.auteur ?? "l'auteur",
            }
          : {
              titre: 'Rétablir cette publication ?',
              message: 'Elle redeviendra visible dans le fil et ses signalements seront remis à zéro.',
              confirmer: 'Rétablir',
              notification: s.auteur ?? "l'auteur",
            },
      );
      if (!reponse.ok) return;
      notification = reponse.notification;
    }
    this.enCours.set(s.publicationId);
    this.api.moderer(s.publicationId, statut, notification).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(statut === 'MASQUEE' ? 'Publication masquée.' : 'Publication rétablie, signalements remis à zéro.');
        this.notifications.rafraichir();
        this.liste.reload();
      },
      error: (e) => {
        this.enCours.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
