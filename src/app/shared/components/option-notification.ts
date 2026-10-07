import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { OptionsNotification } from '../../core/models/common.model';
import { Icon } from '../icons/icon';

/** Valeur initiale : l'utilisateur est prévenu, sans message particulier. */
export function notificationParDefaut(): OptionsNotification {
  return { notifier: true, motif: null };
}

/**
 * Option « Prévenir l'utilisateur », cochée par défaut, avec un message
 * facultatif joint à la notification (motif, explication).
 */
@Component({
  selector: 'app-option-notification',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './option-notification.html',
})
export class OptionNotification {
  /** Nom de la personne prévenue (« Awa Coulibaly », « l'auteur »…). */
  readonly destinataire = input<string | null | undefined>(null);
  readonly placeholder = input('Message joint (facultatif) : motif, explication…');
  readonly valeur = model<OptionsNotification>(notificationParDefaut());
}
