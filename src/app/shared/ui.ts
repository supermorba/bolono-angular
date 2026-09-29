import { ChangeDetectionStrategy, Component, Injectable, computed, inject, input, output, signal } from '@angular/core';
import type { OptionsNotification } from '../core/models';
import { OptionNotification, notificationParDefaut } from './option-notification';
import { ToastService } from '../core/toast.service';
import { initiales, mediaUrl } from '../core/format';
import { Icon } from './icon';

/** Photo de profil, ou initiales sur fond sable si absente / en erreur. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    @if (src() && !enErreur()) {
      <img
        [src]="src()"
        [alt]="nom()"
        class="rounded-full object-cover ring-2 ring-surface"
        [style.width.px]="size()"
        [style.height.px]="size()"
        (error)="enErreur.set(true)"
      />
    } @else {
      <span
        class="flex items-center justify-center rounded-full bg-sand font-bold text-brown ring-2 ring-surface"
        [style.width.px]="size()"
        [style.height.px]="size()"
        [style.font-size.px]="size() * 0.38"
        >{{ lettres() }}</span
      >
    }
  `,
})
export class Avatar {
  readonly photo = input<string | null | undefined>(null);
  readonly nom = input<string | null | undefined>('');
  readonly size = input(36);
  readonly bucket = input('bolono-profiles');

  protected readonly enErreur = signal(false);
  protected readonly src = computed(() => mediaUrl(this.photo(), this.bucket()));
  protected readonly lettres = computed(() => initiales(this.nom()));
}

export type Ton = 'neutre' | 'succes' | 'attention' | 'erreur' | 'info' | 'accent';

/** Pastille de statut (commande, produit, candidature…). */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `<span class="rounded-full px-2.5 py-0.5 text-2xs font-semibold whitespace-nowrap" [class]="classes()"
    ><ng-content
  /></span>`,
})
export class Badge {
  readonly ton = input<Ton>('neutre');
  protected readonly classes = computed(
    () =>
      ({
        neutre: 'bg-card text-muted-strong',
        succes: 'bg-success-surface text-success',
        attention: 'bg-warning-surface text-warning',
        erreur: 'bg-error-surface text-error',
        info: 'bg-info-surface text-info',
        accent: 'bg-terracotta-light text-terracotta',
      })[this.ton()],
  );
}

/** « ↑ +12 % vs mois dernier ». Sans base de comparaison : « Nouveau ». */
@Component({
  selector: 'app-evolution',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      @if (valeur() === null) {
        <span class="font-semibold text-muted-strong">—</span>
      } @else {
        <span class="inline-flex items-center gap-0.5 font-bold" [class]="valeur()! >= 0 ? 'text-success' : 'text-error'">
          <app-icon [name]="valeur()! >= 0 ? 'arrow-up' : 'arrow-down'" [size]="13" />
          {{ valeur()! > 0 ? '+' : '' }}{{ valeur() }}%
        </span>
      }
      @if (libelle()) {
        <span class="text-muted">{{ libelle() }}</span>
      }
    </span>
  `,
})
export class Evolution {
  readonly valeur = input<number | null>(null);
  readonly libelle = input('vs mois dernier');
}

/** Fine barre de progression indéterminée, en haut d'une carte, pendant un rechargement. */
@Component({
  selector: 'app-barre-chargement',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none absolute inset-x-0 top-0 block h-0.5 overflow-hidden rounded-t-2xl' },
  styles: `
    @keyframes defiler {
      from { transform: translateX(-100%); }
      to { transform: translateX(250%); }
    }
    .barre { animation: defiler 1.1s ease-in-out infinite; }
  `,
  template: `
    @if (actif()) {
      <span class="barre block h-full w-2/5 rounded-full bg-terracotta"></span>
    }
  `,
})
export class BarreChargement {
  readonly actif = input(false);
}

/** Bloc de chargement (squelette). */
@Component({
  selector: 'app-squelette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<div class="animate-pulse rounded-xl bg-card/80" [style.height.px]="hauteur()"></div>`,
})
export class Squelette {
  readonly hauteur = input(16);
}

/** État vide ou en erreur d'une liste. */
@Component({
  selector: 'app-etat-vide',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-full bg-ochre-surface text-terracotta">
        <app-icon [name]="icone()" [size]="24" />
      </span>
      <p class="text-sm font-semibold text-brown">{{ titre() }}</p>
      @if (message()) {
        <p class="max-w-sm text-xs text-muted">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EtatVide {
  readonly icone = input('info');
  readonly titre = input.required<string>();
  readonly message = input<string>();
}

/** Pagination « Précédent / page x sur y / Suivant ». */
@Component({
  selector: 'app-pagination',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pages() > 1) {
      <div class="flex flex-wrap items-center justify-between gap-3 px-1 pt-4 text-xs text-muted-strong">
        <span>{{ total() }} résultat{{ total() > 1 ? 's' : '' }}</span>
        <div class="flex items-center gap-2">
          <button class="btn-outline btn-sm" [disabled]="page() === 0" (click)="changer.emit(page() - 1)">
            <app-icon name="caret-left" [size]="14" /> <span class="hidden sm:inline">Précédent</span>
          </button>
          <span class="px-1">Page {{ page() + 1 }} / {{ pages() }}</span>
          <button class="btn-outline btn-sm" [disabled]="page() >= pages() - 1" (click)="changer.emit(page() + 1)">
            <span class="hidden sm:inline">Suivant</span> <app-icon name="caret-right" [size]="14" />
          </button>
        </div>
      </div>
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pages = input.required<number>();
  readonly total = input(0);
  readonly changer = output<number>();
}

// ── Dialogue de confirmation ────────────────────────────────────────────────

export interface DemandeConfirmation {
  titre: string;
  message: string;
  confirmer?: string;
  danger?: boolean;
  /** Champ texte facultatif (ex. motif de refus). */
  champ?: { libelle: string; obligatoire?: boolean };
  /**
   * L'action touche un utilisateur : propose de le prévenir (coché par
   * défaut). Valeur : son nom, affiché dans l'option.
   */
  notification?: string | null;
}

export interface ReponseConfirmation {
  ok: boolean;
  texte: string;
  /** Choix de notification (toujours renseigné ; sans effet si la demande n'en proposait pas). */
  notification: OptionsNotification;
}

interface DemandeEnCours extends DemandeConfirmation {
  resoudre: (reponse: ReponseConfirmation) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  readonly demande = signal<DemandeEnCours | null>(null);

  demander(demande: DemandeConfirmation): Promise<ReponseConfirmation> {
    return new Promise((resoudre) => this.demande.set({ ...demande, resoudre }));
  }

  repondre(ok: boolean, texte = '', notification: OptionsNotification = notificationParDefaut()): void {
    const demande = this.demande();
    this.demande.set(null);
    demande?.resoudre({ ok, texte, notification });
  }
}

@Component({
  selector: 'app-confirmation',
  imports: [OptionNotification],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.enter)': 'entree($event)', '(document:keydown.escape)': 'service.demande() && annuler()' },
  template: `
    @if (service.demande(); as d) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-brown/40 p-4 backdrop-blur-[2px]" (click)="annuler()">
        <div class="card w-full max-w-md p-5 sm:p-6" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <h2 class="text-lg font-extrabold">{{ d.titre }}</h2>
          <p class="mt-2 text-sm text-muted-strong">{{ d.message }}</p>
          @if (d.champ) {
            <label class="mt-4 block text-xs font-semibold text-muted-strong">
              {{ d.champ.libelle }}
              <textarea #texte class="input mt-1.5 min-h-24" (input)="saisie.set(texte.value)"></textarea>
            </label>
          }
          @if (d.notification !== undefined) {
            <app-option-notification
              class="mt-4 block"
              [destinataire]="d.notification"
              [placeholder]="d.champ ? 'Message joint (facultatif) : par défaut, le texte ci-dessus' : 'Message joint (facultatif) : motif, explication…'"
              [(valeur)]="notification"
            />
          }
          <div class="mt-6 flex justify-end gap-2">
            <button class="btn-outline" (click)="annuler()">Annuler</button>
            <button
              [class]="d.danger ? 'btn-danger' : 'btn-accent'"
              [disabled]="d.champ?.obligatoire && !saisie().trim()"
              (click)="valider()"
            >
              {{ d.confirmer ?? 'Confirmer' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Confirmation {
  protected readonly service = inject(ConfirmationService);
  protected readonly saisie = signal('');
  protected notification = notificationParDefaut();

  protected valider(): void {
    const texte = this.saisie().trim();
    const notification = this.notification;
    this.reinitialiser();
    this.service.repondre(true, texte, notification);
  }

  /** Entrée confirme (hors zone de texte), sauf si un texte obligatoire manque. */
  protected entree(evenement: Event): void {
    const d = this.service.demande();
    if (!d || (evenement.target as HTMLElement | null)?.tagName === 'TEXTAREA') return;
    if (d.champ?.obligatoire && !this.saisie().trim()) return;
    evenement.preventDefault();
    this.valider();
  }

  protected annuler(): void {
    this.reinitialiser();
    this.service.repondre(false);
  }

  private reinitialiser(): void {
    this.saisie.set('');
    this.notification = notificationParDefaut();
  }
}

// ── Toasts ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-toasts',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96">
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-3.5 text-sm shadow-lg"
          [class]="t.type === 'erreur' ? 'border-error/30' : t.type === 'succes' ? 'border-success/30' : 'border-line'"
          role="status"
        >
          <app-icon
            [name]="t.type === 'erreur' ? 'warning' : t.type === 'succes' ? 'check-circle' : 'info'"
            weight="fill"
            [size]="20"
            [class]="t.type === 'erreur' ? 'text-error' : t.type === 'succes' ? 'text-success' : 'text-info'"
          />
          <p class="flex-1 text-brown">{{ t.message }}</p>
          <button class="text-muted hover:text-brown" (click)="toasts.fermer(t.id)" aria-label="Fermer">
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly toasts = inject(ToastService);
}
