import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../core/admin-api.service';
import { mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { BadgeAdmin } from '../core/models';
import { API_ADMIN } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Modale, Televersement } from '../shared/fenetres';
import { Icon } from '../shared/icon';
import { ConfirmationService, EtatVide, Squelette, EntetePage } from '../shared/ui';

/** Fenêtre de création ou de modification d'un badge. */
@Component({
  selector: 'app-formulaire-badge',
  imports: [FormsModule, Modale, Televersement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modale [titre]="badge() ? 'Modifier le badge' : 'Nouveau badge'" (fermer)="fermer.emit()">
      <form id="form-badge" class="space-y-3.5" (submit)="$event.preventDefault(); enregistrer()">
        <div>
          <p class="mb-1.5 text-xs font-semibold text-muted-strong">Icône</p>
          <app-televersement categorie="BADGE_ICONE" [(url)]="modele.urlIcone" hauteurApercu="h-32 object-contain! bg-surface" hauteurVide="h-28" />
        </div>
        <label class="block text-xs font-semibold text-muted-strong">
          Intitulé
          <input class="input mt-1" name="intitule" [(ngModel)]="modele.intitule" required maxlength="120" placeholder="Maître teinturier" />
        </label>
        <label class="block text-xs font-semibold text-muted-strong">
          Catégorie (facultative)
          <input class="input mt-1" name="categorie" [(ngModel)]="modele.categorie" maxlength="60" placeholder="Teinture" />
        </label>
        <label class="block text-xs font-semibold text-muted-strong">
          Description
          <textarea class="input mt-1 min-h-20" name="description" [(ngModel)]="modele.description" maxlength="2000"></textarea>
        </label>
      </form>
      <ng-container pied>
        <button class="btn-outline" (click)="fermer.emit()">Annuler</button>
        <button class="btn-accent" type="submit" form="form-badge" [disabled]="enregistrement()">Enregistrer</button>
      </ng-container>
    </app-modale>
  `,
})
export class FormulaireBadge {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);

  readonly badge = input<BadgeAdmin | null>(null);
  readonly fermer = output<void>();
  readonly enregistre = output<BadgeAdmin>();

  protected readonly enregistrement = signal(false);
  protected modele = { intitule: '', description: '', categorie: '', urlIcone: null as string | null };

  ngOnInit(): void {
    const b = this.badge();
    if (b) this.modele = { intitule: b.intitule, description: b.description ?? '', categorie: b.categorie ?? '', urlIcone: b.urlIcone };
  }

  protected enregistrer(): void {
    if (!this.modele.intitule.trim()) {
      this.toast.erreur("L'intitulé est obligatoire.");
      return;
    }
    this.enregistrement.set(true);
    this.api
      .enregistrerBadge(this.badge()?.id ?? null, {
        intitule: this.modele.intitule.trim(),
        description: this.modele.description.trim() || null,
        categorie: this.modele.categorie.trim() || null,
        urlIcone: this.modele.urlIcone,
      })
      .subscribe({
        next: (b) => {
          this.enregistrement.set(false);
          this.toast.succes(this.badge() ? 'Badge mis à jour.' : 'Badge créé.');
          this.enregistre.emit(b);
        },
        error: (e) => {
          this.enregistrement.set(false);
          this.toast.erreur(messageApi(e));
        },
      });
  }
}

@Component({
  selector: 'app-badges',
  imports: [EntetePage, Icon, EtatVide, Squelette, FormulaireBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-entete-page titre="Badges">
      <button actions class="btn-accent" (click)="edite.set('nouveau')"><app-icon name="plus" [size]="18" /> Nouveau badge</button>
    </app-entete-page>

    @if (badges.error() && !badges.hasValue()) {
      <div class="card">
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="badges.reload()">Réessayer</button>
        </app-etat-vide>
      </div>
    } @else if (badges.hasValue()) {
      @if (badges.value().length) {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          @for (b of badges.value(); track b.id) {
            <article class="card flex flex-col p-5">
              <div class="flex items-start gap-4">
                @if (mediaUrl(b.urlIcone); as src) {
                  <img [src]="src" alt="" class="h-16 w-16 shrink-0 rounded-2xl bg-ivory object-contain p-1.5" />
                } @else {
                  <span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-warning-surface text-warning"><app-icon name="medal" weight="fill" [size]="32" /></span>
                }
                <div class="min-w-0 flex-1">
                  <h2 class="font-bold">{{ b.intitule }}</h2>
                  @if (b.categorie) {
                    <p class="text-xs text-muted">{{ b.categorie }}</p>
                  }
                </div>
              </div>
              @if (b.description) {
                <p class="mt-3 line-clamp-3 text-sm text-muted-strong">{{ b.description }}</p>
              }
              <div class="mt-auto flex items-center gap-4 pt-4 text-xs text-muted-strong">
                <span><b class="text-brown">{{ nombre(b.obtentions) }}</b> obtention{{ b.obtentions > 1 ? 's' : '' }}</span>
                <span><b class="text-brown">{{ b.quiz }}</b> quiz</span>
                <span class="ml-auto flex gap-1">
                  <button class="rounded-lg p-2 text-muted hover:bg-card hover:text-brown" (click)="edite.set(b)" aria-label="Modifier"><app-icon name="pencil-simple" [size]="17" /></button>
                  <button class="rounded-lg p-2 text-muted hover:bg-error-surface hover:text-error" (click)="supprimer(b)" aria-label="Supprimer"><app-icon name="trash" [size]="17" /></button>
                </span>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="card">
          <app-etat-vide icone="medal" titre="Aucun badge" message="Créez un premier badge pour récompenser les apprenants.">
            <button class="btn-accent btn-sm mt-2" (click)="edite.set('nouveau')">Créer un badge</button>
          </app-etat-vide>
        </div>
      }
    } @else {
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <app-squelette [hauteur]="170" />
        }
      </div>
    }

    @if (edite(); as b) {
      <app-formulaire-badge [badge]="b === 'nouveau' ? null : b" (fermer)="edite.set(null)" (enregistre)="edite.set(null); badges.reload()" />
    }
  `,
})
export class BadgesPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly mediaUrl = mediaUrl;
  protected readonly nombre = nombre;

  protected readonly badges = httpResource<BadgeAdmin[]>(() => `${API_ADMIN}/badges`);
  protected readonly erreur = computed(() => messageApi(this.badges.error()));
  protected readonly edite = signal<BadgeAdmin | 'nouveau' | null>(null);

  protected async supprimer(b: BadgeAdmin): Promise<void> {
    const { ok } = await this.confirmation.demander({
      titre: `Supprimer le badge « ${b.intitule} » ?`,
      message:
        (b.obtentions ? `Il sera retiré aux ${b.obtentions} utilisateur(s) qui l'ont obtenu. ` : '') +
        (b.quiz ? `Les ${b.quiz} quiz qui le décernaient n'en décerneront plus.` : ''),
      confirmer: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.api.supprimerBadge(b.id).subscribe({
      next: () => {
        this.toast.succes('Badge supprimé.');
        this.badges.reload();
      },
      error: (e) => this.toast.erreur(messageApi(e)),
    });
  }
}
