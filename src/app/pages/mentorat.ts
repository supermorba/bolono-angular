import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { AdminApi } from '../core/admin-api.service';
import { environment } from '../../environments/environment';
import { derniereValeur, rechargerEnDirect, sansVides } from '../core/ressources';
import { dateCourte, dateHeure } from '../core/format';
import { messageApi } from '../core/http';
import type { CandidatureMentor, Page, StatutCandidature } from '../core/models';
import { NotificationsService } from '../core/notifications.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Avatar, Badge, ConfirmationService, EtatVide, Pagination, Squelette, type Ton } from '../shared/ui';

const STATUTS: Record<StatutCandidature, { libelle: string; ton: Ton }> = {
  EN_ATTENTE: { libelle: 'En attente', ton: 'attention' },
  ACCEPTE: { libelle: 'Acceptée', ton: 'succes' },
  REFUSE: { libelle: 'Refusée', ton: 'erreur' },
};

@Component({
  selector: 'app-mentorat',
  imports: [Icon, Avatar, Badge, EtatVide, Pagination, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <h1 class="flex items-center gap-3 text-2xl font-extrabold">
        Mentorat
        @if (liste.isLoading() && page()) {
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-terracotta" aria-label="Mise à jour"></span>
        }
      </h1>
      <p class="mt-1 text-sm text-muted-strong">
        Candidatures des artisans souhaitant devenir mentors. Un mentor peut publier des formations et des statuts.
      </p>
    </div>

    <div class="onglets mb-5 sm:w-fit" role="tablist">
      @for (o of onglets; track o.valeur) {
        <button
          class="onglet"
          [class.onglet-actif]="statut() === o.valeur"
          role="tab"
          [attr.aria-selected]="statut() === o.valeur"
          (click)="filtrer(o.valeur)"
        >
          {{ o.libelle }}
        </button>
      }
    </div>

    @if (liste.error() && !page()) {
      <div class="card">
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="liste.reload()">Réessayer</button>
        </app-etat-vide>
      </div>
    } @else if (page(); as p) {
      @if (p.content.length) {
        <div class="grid grid-cols-1 gap-5 transition-opacity xl:grid-cols-2" [class.opacity-60]="liste.isLoading()">
          @for (c of p.content; track c.id) {
            <article class="card p-4 sm:p-5">
              <div class="flex items-start gap-4">
                <app-avatar [photo]="c.photoUrl" [nom]="c.artisanNom" [size]="52" />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="font-bold">{{ c.artisanNom }}</h2>
                    <app-badge [ton]="statuts[c.statut].ton">{{ statuts[c.statut].libelle }}</app-badge>
                  </div>
                  <p class="text-xs text-muted">
                    {{ c.specialite ?? 'Artisan' }} · candidature du {{ dateCourte(c.dateCandidature) }}
                  </p>
                </div>
              </div>

              <dl class="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt class="text-xs text-muted">Domaine d'expertise</dt>
                  <dd class="font-medium">{{ c.domaineExpertise || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted">Expérience</dt>
                  <dd class="font-medium">{{ c.anneesExperience != null ? c.anneesExperience + ' an' + (c.anneesExperience > 1 ? 's' : '') : '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted">Contact</dt>
                  <dd class="truncate font-medium">{{ c.artisanTelephone || c.artisanEmail || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted">Atelier</dt>
                  <dd class="truncate font-medium">{{ c.adresseAtelier || '—' }}</dd>
                </div>
              </dl>

              @if (c.motivation) {
                <blockquote class="mt-4 rounded-xl bg-ochre-surface p-3.5 text-sm text-muted-strong italic">« {{ c.motivation }} »</blockquote>
              }
              @if (c.lienGroupeWhatsapp) {
                <a [href]="c.lienGroupeWhatsapp" target="_blank" rel="noopener" class="link-accent mt-3 inline-block">Groupe WhatsApp proposé ↗</a>
              }

              @if (c.statut === 'EN_ATTENTE') {
                <div class="mt-5 flex gap-2">
                  <button class="btn-accent flex-1" [disabled]="enCours() === c.id" (click)="decider(c, 'ACCEPTE')">
                    <app-icon name="seal-check" [size]="18" /> Accepter
                  </button>
                  <button class="btn-outline flex-1" [disabled]="enCours() === c.id" (click)="decider(c, 'REFUSE')">
                    <app-icon name="x" [size]="18" /> Refuser
                  </button>
                </div>
              } @else {
                <p class="mt-4 border-t border-line pt-3 text-xs text-muted">
                  {{ c.statut === 'ACCEPTE' ? 'Acceptée' : 'Refusée' }} le {{ dateHeure(c.dateDecision) }}
                  {{ c.adminDecideurNom ? 'par ' + c.adminDecideurNom : '' }}
                  @if (c.motifRefus) {
                    — motif : {{ c.motifRefus }}
                  }
                </p>
              }
            </article>
          }
        </div>
        <app-pagination [page]="p.number" [pages]="p.totalPages" [total]="p.totalElements" (changer)="numero.set($event)" />
      } @else {
        <div class="card">
          <app-etat-vide
            icone="seal-check"
            [titre]="statut() === 'EN_ATTENTE' ? 'Aucune candidature en attente' : 'Aucune candidature'"
            message="Les demandes des artisans apparaîtront ici."
          />
        </div>
      }
    } @else {
      <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
        @for (i of [1, 2]; track i) {
          <app-squelette [hauteur]="280" />
        }
      </div>
    }
  `,
})
export class MentoratPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifications = inject(NotificationsService);
  protected readonly dateCourte = dateCourte;
  protected readonly dateHeure = dateHeure;
  protected readonly statuts = STATUTS;
  protected readonly onglets: { valeur: StatutCandidature | ''; libelle: string }[] = [
    { valeur: 'EN_ATTENTE', libelle: 'En attente' },
    { valeur: 'ACCEPTE', libelle: 'Acceptées' },
    { valeur: 'REFUSE', libelle: 'Refusées' },
    { valeur: '', libelle: 'Toutes' },
  ];

  protected readonly statut = signal<StatutCandidature | ''>('EN_ATTENTE');
  /** Revient à la première page quand le filtre change. */
  protected readonly numero = linkedSignal(() => {
    this.statut();
    return 0;
  });
  protected readonly liste = httpResource<Page<CandidatureMentor>>(() => ({
    url: `${environment.apiUrl}/api/users/admin/candidatures-mentor`,
    params: sansVides({ statut: this.statut(), page: this.numero(), size: 12 }),
  }));
  /** Page affichée : la précédente reste visible pendant le chargement suivant. */
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly enCours = signal<number | null>(null);

  constructor() {
    rechargerEnDirect(this.liste);
  }

  protected filtrer(statut: StatutCandidature | ''): void {
    this.statut.set(statut);
  }

  protected async decider(c: CandidatureMentor, statut: 'ACCEPTE' | 'REFUSE'): Promise<void> {
    const reponse = await this.confirmation.demander(
      statut === 'ACCEPTE'
        ? {
            titre: `Faire de ${c.artisanNom} un mentor ?`,
            message: 'Il pourra publier des formations et des statuts visibles par ses abonnés.',
            confirmer: 'Accepter',
            notification: c.artisanNom,
          }
        : {
            titre: `Refuser la candidature de ${c.artisanNom} ?`,
            message: "Le motif est enregistré avec la candidature.",
            confirmer: 'Refuser',
            danger: true,
            champ: { libelle: 'Motif du refus', obligatoire: true },
            notification: c.artisanNom,
          },
    );
    if (!reponse.ok) return;
    this.enCours.set(c.id);
    this.api.deciderCandidature(c.id, statut, reponse.texte, reponse.notification).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(statut === 'ACCEPTE' ? `${c.artisanNom} est désormais mentor.` : 'Candidature refusée.');
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
