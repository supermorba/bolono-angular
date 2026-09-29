import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { OptionsNotification } from '../core/models';
import { Icon } from './icon';

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
  template: `
    <div class="rounded-xl border px-3.5 py-3 transition-colors" [class]="valeur().notifier ? 'border-terracotta/30 bg-terracotta-light/50' : 'border-line bg-ivory'">
      <label class="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          class="mt-0.5 h-4 w-4 shrink-0 accent-terracotta"
          [checked]="valeur().notifier"
          (change)="valeur.set({ notifier: $any($event.target).checked, motif: valeur().motif })"
        />
        <span class="min-w-0 text-ms">
          <span class="flex items-center gap-1.5 font-semibold">
            <app-icon name="bell" [size]="15" />
            Prévenir {{ destinataire() || "l'utilisateur" }}
          </span>
          <span class="block text-xs text-muted-strong">Notification dans l'application et sur son téléphone.</span>
        </span>
      </label>
      @if (valeur().notifier) {
        <textarea
          class="input mt-2.5 min-h-16 bg-surface! text-ms!"
          maxlength="1000"
          [placeholder]="placeholder()"
          [value]="valeur().motif ?? ''"
          (input)="valeur.set({ notifier: true, motif: $any($event.target).value || null })"
          aria-label="Message joint à la notification"
        ></textarea>
      }
    </div>
  `,
})
export class OptionNotification {
  /** Nom de la personne prévenue (« Awa Coulibaly », « l'auteur »…). */
  readonly destinataire = input<string | null | undefined>(null);
  readonly placeholder = input('Message joint (facultatif) : motif, explication…');
  readonly valeur = model<OptionsNotification>(notificationParDefaut());
}
