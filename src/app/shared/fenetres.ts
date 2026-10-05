import { HttpEventType } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, model, output, signal } from '@angular/core';
import type { Subscription } from 'rxjs';
import { AdminApi } from '../core/admin-api.service';
import { mediaUrl } from '../core/format';
import { messageApi } from '../core/http';
import type { CategorieFichier } from '../core/models';
import { Icon } from './icon';

/** Fenêtre modale centrée (formulaires courts, éditeur de quiz…). */
@Component({
  selector: 'app-modale',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'fermer.emit()' },
  template: `
    <div class="fixed inset-0 z-40 bg-brown/40 transition-opacity starting:opacity-0" (click)="fermer.emit()"></div>
    <div class="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6">
      <div
        class="card pointer-events-auto my-auto shadow-flottant flex max-h-[calc(100dvh-1.5rem)] w-full flex-col transition duration-200 starting:scale-95 starting:opacity-0 sm:max-h-[calc(100dvh-3rem)]"
        [class]="largeur()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="titre()"
      >
        <div class="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 class="text-lg font-bold">{{ titre() }}</h2>
          <button class="rounded-lg p-1.5 text-muted hover:bg-card hover:text-brown" (click)="fermer.emit()" aria-label="Fermer">
            <app-icon name="x" [size]="20" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6"><ng-content /></div>
        <div class="flex flex-wrap justify-end gap-2 border-t border-line bg-ivory/60 px-5 py-3.5 sm:px-6">
          <ng-content select="[pied]" />
        </div>
      </div>
    </div>
  `,
})
export class Modale {
  readonly titre = input.required<string>();
  /** Classe de largeur maximale (max-w-lg par défaut). */
  readonly largeur = input('max-w-lg');
  readonly fermer = output<void>();
}

/** Panneau latéral droit (fiches détaillées). */
@Component({
  selector: 'app-panneau',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'fermer.emit()' },
  template: `
    <div class="fixed inset-0 z-40 bg-brown/30 transition-opacity starting:opacity-0" (click)="fermer.emit()"></div>
    <aside
      class="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-2xl transition-transform duration-200 starting:translate-x-full"
      [class]="largeur()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="titre()"
    >
      <div class="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <h2 class="truncate text-lg font-bold">{{ titre() }}</h2>
        <button class="rounded-lg p-1.5 text-muted hover:bg-card hover:text-brown" (click)="fermer.emit()" aria-label="Fermer">
          <app-icon name="x" [size]="20" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6"><ng-content /></div>
      <ng-content select="[pied]" />
    </aside>
  `,
})
export class Panneau {
  readonly titre = input.required<string>();
  readonly largeur = input('max-w-lg');
  readonly fermer = output<void>();
}

/**
 * Champ de fichier : aperçu du média actuel, choix ou glisser-déposer d'un
 * fichier, téléversement avec barre de progression. [url] est lié en double
 * sens ; pour une vidéo, [duree] reçoit la durée lue dans le fichier.
 */
@Component({
  selector: 'app-televersement',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative overflow-hidden rounded-xl border-2 border-dashed transition"
      [class]="survol() ? 'border-terracotta bg-terracotta-light' : 'border-line bg-ivory'"
      (dragover)="$event.preventDefault(); survol.set(true)"
      (dragleave)="survol.set(false)"
      (drop)="deposer($event)"
    >
      @if (apercu(); as src) {
        @if (video()) {
          <video [src]="src" controls preload="metadata" class="aspect-video w-full bg-black object-contain"></video>
        } @else {
          <img [src]="src" alt="" class="w-full object-cover" [class]="hauteurApercu()" />
        }
      } @else {
        <div class="flex flex-col items-center justify-center gap-1.5 px-4 text-center text-muted" [class]="hauteurVide()">
          <app-icon [name]="video() ? 'play-circle' : 'image'" [size]="30" />
          <p class="text-xs">Glissez un fichier ici ou choisissez-le</p>
        </div>
      }
      @if (enCours()) {
        <div class="absolute inset-x-0 bottom-0 h-1.5 bg-black/10">
          <div class="h-full bg-terracotta transition-[width]" [style.width.%]="progression()"></div>
        </div>
      }
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <label class="btn-outline btn-sm cursor-pointer" [class.pointer-events-none]="enCours()" [class.opacity-50]="enCours()">
        <app-icon name="arrow-up" [size]="14" />
        {{ enCours() ? 'Envoi… ' + progression() + ' %' : url() ? 'Remplacer' : 'Choisir un fichier' }}
        <input type="file" class="sr-only" [accept]="video() ? 'video/*' : 'image/*'" (change)="choisir($event)" />
      </label>
      @if (url() && !enCours() && effacable()) {
        <button type="button" class="btn-sm text-xs font-semibold text-error hover:underline" (click)="url.set(null)">Retirer</button>
      }
      @if (enCours()) {
        <button type="button" class="btn-sm text-xs font-semibold text-muted-strong hover:underline" (click)="annuler()">Annuler</button>
      }
    </div>
    @if (erreur(); as message) {
      <p class="mt-1.5 text-xs text-error">{{ message }}</p>
    }
  `,
})
export class Televersement {
  private readonly api = inject(AdminApi);

  readonly categorie = input.required<CategorieFichier>();
  readonly url = model<string | null>(null);
  readonly duree = output<number>();
  readonly effacable = input(true);
  readonly hauteurApercu = input('max-h-48');
  readonly hauteurVide = input('h-36');

  protected readonly enCours = signal(false);
  protected readonly progression = signal(0);
  protected readonly erreur = signal<string | null>(null);
  protected readonly survol = signal(false);
  protected readonly video = computed(() => this.categorie() === 'FORMATION_COURS');
  protected readonly apercu = computed(() => mediaUrl(this.url()));
  private envoi: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.envoi?.unsubscribe());
  }

  protected choisir(evenement: Event): void {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = '';
    if (fichier) this.envoyer(fichier);
  }

  protected deposer(evenement: DragEvent): void {
    evenement.preventDefault();
    this.survol.set(false);
    const fichier = evenement.dataTransfer?.files?.[0];
    if (fichier) this.envoyer(fichier);
  }

  protected annuler(): void {
    this.envoi?.unsubscribe();
    this.enCours.set(false);
  }

  private envoyer(fichier: File): void {
    const attendu = this.video() ? 'video/' : 'image/';
    if (!fichier.type.startsWith(attendu)) {
      this.erreur.set(this.video() ? 'Choisissez une vidéo.' : 'Choisissez une image.');
      return;
    }
    this.erreur.set(null);
    this.enCours.set(true);
    this.progression.set(0);
    if (this.video()) this.lireDuree(fichier);
    this.envoi = this.api.televerser(this.categorie(), fichier).subscribe({
      next: (evenement) => {
        if (evenement.type === HttpEventType.UploadProgress && evenement.total) {
          this.progression.set(Math.round((evenement.loaded / evenement.total) * 100));
        } else if (evenement.type === HttpEventType.Response && evenement.body) {
          this.enCours.set(false);
          this.url.set(evenement.body.url);
        }
      },
      error: (e) => {
        this.enCours.set(false);
        this.erreur.set(messageApi(e, "L'envoi du fichier a échoué."));
      },
    });
  }

  /** Durée de la vidéo lue localement, sans attendre la fin de l'envoi. */
  private lireDuree(fichier: File): void {
    const element = document.createElement('video');
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      if (Number.isFinite(element.duration)) this.duree.emit(Math.round(element.duration));
      URL.revokeObjectURL(element.src);
    };
    element.src = URL.createObjectURL(fichier);
  }
}
