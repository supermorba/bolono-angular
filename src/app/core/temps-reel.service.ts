import { Injectable, inject, signal } from '@angular/core';
import type { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import type { EvenementAdmin } from './models';

export type EtatConnexion = 'deconnecte' | 'connexion' | 'connecte';

/**
 * Canal temps réel du back-office (STOMP sur WebSocket, /ws).
 *
 * Reçoit les événements admin (nouvelle candidature, signalement, produit à
 * valider, commande) dès qu'ils se produisent. Le jeton Firebase est relu à
 * chaque (re)connexion : il expire au bout d'une heure. La bibliothèque STOMP
 * est chargée à la demande, hors du bundle initial.
 */
@Injectable({ providedIn: 'root' })
export class TempsReelService {
  private readonly auth = inject(AuthService);
  private client: Client | null = null;
  /** Incrémenté à chaque arrêt : invalide un démarrage encore en cours. */
  private generation = 0;
  private demarrage = false;
  private abonnement: StompSubscription | null = null;
  private readonly ecouteurs = new Set<(evenement: EvenementAdmin) => void>();

  readonly etat = signal<EtatConnexion>('deconnecte');

  demarrer(): void {
    if (this.client || this.demarrage) return;
    this.demarrage = true;
    const generation = this.generation;
    void import('@stomp/stompjs')
      .then(({ Client }) => {
        this.demarrage = false;
        if (generation === this.generation && !this.client) this.connecter(new Client());
      })
      .catch(() => (this.demarrage = false));
  }

  private connecter(client: Client): void {
    client.configure({
      brokerURL: `${environment.apiUrl.replace(/^http/, 'ws')}/ws`,
      reconnectDelay: 5_000,
      heartbeatIncoming: 20_000,
      heartbeatOutgoing: 20_000,
      beforeConnect: async (c) => {
        this.etat.set('connexion');
        const jeton = await this.auth.jeton();
        c.connectHeaders = jeton ? { Authorization: `Bearer ${jeton}` } : {};
      },
      onConnect: () => {
        this.etat.set('connecte');
        this.abonnement = client.subscribe('/topic/admin.evenements', (message: IMessage) => {
          const evenement = JSON.parse(message.body) as EvenementAdmin;
          this.ecouteurs.forEach((ecouteur) => ecouteur(evenement));
        });
      },
      onWebSocketClose: () => this.etat.set('deconnecte'),
      onStompError: () => this.etat.set('deconnecte'),
    });
    this.client = client;
    client.activate();
  }

  arreter(): void {
    this.generation++;
    this.demarrage = false;
    this.abonnement = null;
    void this.client?.deactivate();
    this.client = null;
    this.etat.set('deconnecte');
  }

  /** S'abonne aux événements admin ; renvoie la fonction de désabonnement. */
  ecouter(ecouteur: (evenement: EvenementAdmin) => void): () => void {
    this.ecouteurs.add(ecouteur);
    return () => this.ecouteurs.delete(ecouteur);
  }
}
