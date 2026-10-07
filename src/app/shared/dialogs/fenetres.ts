import { HttpEventType } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import { UploadService } from '../services/upload.service';
import { mediaUrl } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { CategorieFichier } from '../models/upload.model';
import { Icon } from '../icons/icon';

/** Fenêtre modale centrée (formulaires courts, éditeur de quiz…). */
@Component({
  selector: 'app-modale',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'fermer.emit()' },
  templateUrl: './modale.html',
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
  templateUrl: './panneau.html',
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
  templateUrl: './televersement.html',
})
export class Televersement {
  private readonly api = inject(UploadService);

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
