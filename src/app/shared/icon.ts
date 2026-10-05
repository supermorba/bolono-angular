import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ICONS } from './icons';

/**
 * Icône Phosphor (même famille que l'app mobile).
 * <app-icon name="house" /> — style « regular » ; weight="fill" pour le plein.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    fill="currentColor"
    [attr.width]="size()"
    [attr.height]="size()"
    [innerHTML]="contenu()"
  ></svg>`,
})
export class Icon {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<string>();
  readonly size = input(20);
  readonly weight = input<'regular' | 'fill'>('regular');

  // Contenu issu d'un fichier généré (icônes Phosphor), jamais d'une saisie.
  protected readonly contenu = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      ICONS[this.weight() === 'fill' ? `${this.name()}:fill` : this.name()] ?? '',
    ),
  );
}
