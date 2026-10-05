import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminApi } from './admin-api.service';
import type { Notifications } from './models';
import { TempsReelService } from './temps-reel.service';
import { ToastService } from './toast.service';

/**
 * Éléments en attente d'une action de l'administrateur (candidatures de
 * mentorat, publications signalées, paiements, litiges, remboursements et
 * versements). Partagé par la
 * cloche de la barre du haut et les compteurs de la barre latérale.
 *
 * Mis à jour en direct par le canal temps réel ; une interrogation toutes les
 * 5 minutes reste en secours (connexion WebSocket coupée).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(AdminApi);
  private readonly tempsReel = inject(TempsReelService);
  private readonly toast = inject(ToastService);
  private minuterie: ReturnType<typeof setInterval> | null = null;
  private arreterEcoute: (() => void) | null = null;

  /** Incrémenté à chaque événement temps réel : les pages concernées peuvent se recharger. */
  readonly revision = signal(0);

  readonly compteurs = signal<Notifications | null>(null);
  /** Tâches d'argent (« Paiements et litiges »). */
  readonly totalPaiements = computed(() => {
    const c = this.compteurs();
    return c ? c.paiementsAConfirmer + c.litigesEnCours + c.remboursementsAEffectuer + c.versementsAEffectuer : 0;
  });
  readonly total = computed(() => {
    const c = this.compteurs();
    return c ? c.candidaturesEnAttente + c.publicationsSignalees + this.totalPaiements() : 0;
  });

  demarrer(): void {
    this.rafraichir();
    this.minuterie ??= setInterval(() => this.rafraichir(), 5 * 60_000);
    this.tempsReel.demarrer();
    this.arreterEcoute ??= this.tempsReel.ecouter((evenement) => {
      this.rafraichir();
      this.revision.update((n) => n + 1);
      this.toast.info(evenement.message);
    });
  }

  arreter(): void {
    if (this.minuterie) clearInterval(this.minuterie);
    this.minuterie = null;
    this.arreterEcoute?.();
    this.arreterEcoute = null;
    this.tempsReel.arreter();
    this.compteurs.set(null);
  }

  rafraichir(): void {
    this.api.notifications().subscribe({ next: (c) => this.compteurs.set(c), error: () => undefined });
  }
}
