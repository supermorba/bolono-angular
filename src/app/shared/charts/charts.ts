import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

/** Largeur du conteneur, suivie en direct (graphiques en pixels réels, pas étirés). */
function largeurObservee(): () => number {
  const hote = inject(ElementRef<HTMLElement>);
  const largeur = signal(0);
  const observer = new ResizeObserver(([entree]) =>
    largeur.set(Math.floor(entree.contentRect.width)),
  );
  afterNextRender(() => observer.observe(hote.nativeElement));
  inject(DestroyRef).onDestroy(() => observer.disconnect());
  return largeur;
}

/**
 * Maximum « rond » pour l'axe vertical, et ses graduations. [entiers] : pour
 * des comptages (inscriptions…), pas de graduation fractionnaire — avec peu de
 * données, l'axe compte alors 0, 1, 2… au lieu de 0, 0,2, 0,4…
 */
function echelle(max: number, graduations = 5, entiers = false): { max: number; pas: number[] } {
  if (entiers && max > 0 && max < graduations) graduations = Math.max(1, Math.ceil(max));
  if (max <= 0)
    return { max: graduations, pas: Array.from({ length: graduations + 1 }, (_, i) => i) };
  const brut = max / graduations;
  const puissance = 10 ** Math.floor(Math.log10(brut));
  let pas = [1, 2, 2.5, 5, 10].map((m) => m * puissance).find((p) => p >= brut) ?? brut;
  if (entiers) pas = Math.max(1, Math.ceil(pas));
  // Arrondi : sans lui, 3 × 0,2 donne 0,6000000000000001 (étiquette interminable).
  const arrondi = (v: number) => Number(v.toPrecision(12));
  return {
    max: arrondi(pas * graduations),
    pas: Array.from({ length: graduations + 1 }, (_, i) => arrondi(i * pas)),
  };
}

export interface Serie {
  nom: string;
  couleur: string;
  valeurs: number[];
}

/** Courbes avec aire dégradée (ex. inscriptions par jour). */
@Component({
  selector: 'app-courbes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block w-full' },
  templateUrl: './courbes.html',
})
export class Courbes {
  readonly etiquettes = input.required<string[]>();
  readonly series = input.required<Serie[]>();
  readonly hauteur = input(220);

  protected readonly uid = Math.random().toString(36).slice(2, 8);
  protected readonly largeur = largeurObservee();
  protected readonly survol = signal<number | null>(null);
  protected readonly gauche = 34;
  protected readonly haut = 8;
  protected readonly bas = computed(() => this.hauteur() - 24);

  /** Les courbes servent à des comptages : graduations entières. */
  protected readonly axe = computed(() =>
    echelle(Math.max(0, ...this.series().flatMap((s) => s.valeurs)), 5, true),
  );

  protected readonly etiquettesX = computed(() => {
    const n = this.etiquettes().length;
    const cible = Math.max(2, Math.floor(this.largeur() / 70));
    const pas = Math.max(1, Math.ceil(n / cible));
    const indices = this.etiquettes()
      .map((texte, i) => ({ texte, i }))
      .filter(({ i }) => i % pas === 0);
    const dernier = n - 1;
    if (n > 1 && indices.at(-1)?.i !== dernier) {
      if (dernier - (indices.at(-1)?.i ?? 0) < pas * 0.8) indices.pop();
      indices.push({ texte: this.etiquettes()[dernier], i: dernier });
    }
    return indices;
  });

  protected x(i: number): number {
    const n = Math.max(1, this.etiquettes().length - 1);
    return this.gauche + 6 + (i / n) * (this.largeur() - this.gauche - 12);
  }

  protected y(v: number): number {
    return this.bas() - (v / this.axe().max) * (this.bas() - this.haut);
  }

  protected ligne(valeurs: number[]): string {
    return valeurs.map((v, i) => `${i === 0 ? 'M' : 'L'}${this.x(i)},${this.y(v)}`).join(' ');
  }

  protected aire(valeurs: number[]): string {
    if (!valeurs.length) return '';
    return `${this.ligne(valeurs)} L${this.x(valeurs.length - 1)},${this.bas()} L${this.x(0)},${this.bas()} Z`;
  }

  protected suivre(evenement: MouseEvent): void {
    const n = this.etiquettes().length;
    if (n === 0) return;
    const rect = (evenement.target as SVGRectElement).ownerSVGElement!.getBoundingClientRect();
    const position = evenement.clientX - rect.left;
    const i = Math.round(
      ((position - this.gauche - 6) / (this.largeur() - this.gauche - 12)) * (n - 1),
    );
    this.survol.set(Math.max(0, Math.min(n - 1, i)));
  }
}

export interface Part {
  nom: string;
  valeur: number;
  couleur: string;
}

/** Anneau de répartition avec total au centre. */
@Component({
  selector: 'app-anneau',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-flex' },
  templateUrl: './anneau.html',
})
export class Anneau {
  readonly parts = input.required<Part[]>();
  readonly taille = input(170);

  protected readonly rayon = 46;
  protected readonly epaisseur = 18;
  protected readonly circonference = 2 * Math.PI * 46;
  protected readonly survol = signal<string | null>(null);
  protected readonly total = computed(() => this.parts().reduce((s, p) => s + p.valeur, 0));
  protected readonly partSurvolee = computed(() =>
    this.parts().find((p) => p.nom === this.survol()),
  );

  protected readonly segments = computed(() => {
    const total = this.total();
    if (total === 0) return [];
    const ecart = this.parts().filter((p) => p.valeur > 0).length > 1 ? 1.5 : 0;
    let debut = 0;
    return this.parts()
      .filter((p) => p.valeur > 0)
      .map((p) => {
        const longueur = (p.valeur / total) * this.circonference;
        const segment = { ...p, debut: debut + ecart / 2, longueur: Math.max(0, longueur - ecart) };
        debut += longueur;
        return segment;
      });
  });
}

/** Histogramme (ex. ventes par jour du mois). */
@Component({
  selector: 'app-histogramme',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block w-full' },
  templateUrl: './histogramme.html',
})
export class Histogramme {
  readonly etiquettes = input.required<string[]>();
  readonly valeurs = input.required<number[]>();
  readonly hauteur = input(200);
  readonly format = input<(v: number) => string>((v) => String(v));
  readonly formatInfobulle = input<(v: number) => string>((v) => String(v));

  protected readonly Math = Math;
  protected readonly uid = Math.random().toString(36).slice(2, 8);
  protected readonly largeur = largeurObservee();
  protected readonly survol = signal<number | null>(null);
  protected readonly gauche = 40;
  protected readonly haut = 8;
  protected readonly bas = computed(() => this.hauteur() - 22);
  protected readonly axe = computed(() => echelle(Math.max(0, ...this.valeurs()), 4));

  protected readonly pasX = computed(
    () => (this.largeur() - this.gauche) / Math.max(1, this.valeurs().length),
  );
  protected readonly largeurBarre = computed(() => Math.max(3, Math.min(22, this.pasX() * 0.62)));

  protected xBarre(i: number): number {
    return this.gauche + i * this.pasX() + (this.pasX() - this.largeurBarre()) / 2;
  }

  protected y(v: number): number {
    return this.bas() - (v / this.axe().max) * (this.bas() - this.haut);
  }

  protected afficherEtiquette(i: number): boolean {
    const n = this.valeurs().length;
    const pas = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(this.largeur() / 60))));
    return i % pas === 0;
  }
}
