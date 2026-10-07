import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { OptionsNotification } from '../../core/models/common.model';
import { OptionNotification, notificationParDefaut } from './option-notification';
import { ToastService } from '../../core/notifications/toast.service';
import { initiales, mediaUrl } from '../../core/utils/format';
import { Icon } from '../icons/icon';
import type { Ton } from '../models/ui.model';

export type { Ton } from '../models/ui.model';

/** Photo de profil, ou initiales sur fond sable si absente / en erreur. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  templateUrl: './avatar.html',
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

/** Pastille de statut (commande, produit, candidature…). */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  templateUrl: './badge.html',
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
  templateUrl: './evolution.html',
})
export class Evolution {
  readonly valeur = input<number | null>(null);
  readonly libelle = input('vs mois dernier');
  /** Posé sur le bandeau ébène : variantes claires des couleurs d'état. */
  readonly surFonce = input(false);
  protected readonly couleur = computed(() => {
    const hausse = this.valeur()! >= 0;
    if (this.surFonce()) return hausse ? 'text-success-clair' : 'text-error-clair';
    return hausse ? 'text-success' : 'text-error';
  });
}

export interface ChiffreCle {
  libelle: string;
  /** null : en cours de chargement. */
  valeur: string | null;
  /** Évolution en % (null : pas de base de comparaison). Absente : ligne masquée. */
  evolution?: number | null;
}

/**
 * Chiffres-clés d'une page (slot [bas] d'app-entete-page) : nombres séparés
 * par des filets, dans une carte.
 */
@Component({
  selector: 'app-chiffres-cles',
  imports: [Evolution],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card mt-5 block overflow-hidden px-5 py-4' },
  templateUrl: './chiffres-cles.html',
})
export class ChiffresCles {
  readonly chiffres = input.required<ChiffreCle[]>();
}

/**
 * En-tête de page : titre, sous-titre facultatif (contenu projeté) et
 * boutons ([actions]) ; un contenu pleine largeur (chiffres-clés…) va
 * dans [bas].
 */
@Component({
  selector: 'app-entete-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'entete-page' },
  templateUrl: './entete-page.html',
})
export class EntetePage {
  readonly titre = input.required<string>();
  /** Petit indicateur de rechargement à côté du titre. */
  readonly chargement = input(false);
}

/** Fine barre de progression indéterminée, en haut d'une carte, pendant un rechargement. */
@Component({
  selector: 'app-barre-chargement',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pointer-events-none absolute inset-x-0 top-0 block h-0.5 overflow-hidden rounded-t-2xl',
  },
  styleUrl: './barre-chargement.css',
  templateUrl: './barre-chargement.html',
})
export class BarreChargement {
  readonly actif = input(false);
}

/** Bloc de chargement (squelette). */
@Component({
  selector: 'app-squelette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './squelette.html',
})
export class Squelette {
  readonly hauteur = input(16);
}

/** État vide ou en erreur d'une liste. */
@Component({
  selector: 'app-etat-vide',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './etat-vide.html',
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
  templateUrl: './pagination.html',
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

  repondre(
    ok: boolean,
    texte = '',
    notification: OptionsNotification = notificationParDefaut(),
  ): void {
    const demande = this.demande();
    this.demande.set(null);
    demande?.resoudre({ ok, texte, notification });
  }
}

@Component({
  selector: 'app-confirmation',
  imports: [OptionNotification],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.enter)': 'entree($event)',
    '(document:keydown.escape)': 'service.demande() && annuler()',
  },
  templateUrl: './confirmation.html',
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
  templateUrl: './toasts.html',
})
export class Toasts {
  protected readonly toasts = inject(ToastService);
}
