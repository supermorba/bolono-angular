import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ICONES_CATEGORIES } from './icones-categories';

const PAR_CLE = new Map(ICONES_CATEGORIES.map((i) => [i.cle, i]));

/**
 * Pastille d'une catégorie, telle que l'affiche l'application mobile : l'icône
 * choisie dans la palette, ou l'initiale du nom s'il n'y en a pas.
 */
@Component({
  selector: 'app-icone-categorie',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  templateUrl: './icone-categorie.html',
})
export class IconeCategorie {
  private readonly sanitizer = inject(DomSanitizer);

  readonly cle = input<string | null>(null);
  readonly nom = input('');
  readonly taille = input(32);

  protected readonly icone = computed(() => (this.cle() ? PAR_CLE.get(this.cle()!) : undefined));
  protected readonly initiale = computed(() => this.nom().trim().charAt(0).toUpperCase() || '?');
  // Contenu issu d'un fichier généré (palette Phosphor), jamais d'une saisie.
  protected readonly contenu = computed(() => {
    const icone = this.icone();
    return icone ? this.sanitizer.bypassSecurityTrustHtml(icone.svg) : null;
  });
}
