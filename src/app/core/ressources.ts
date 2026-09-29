import { type HttpResourceRef } from '@angular/common/http';
import { type WritableSignal, effect, inject, linkedSignal, untracked } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { environment } from '../../environments/environment';

/** Racine de l'API d'administration. */
export const API_ADMIN = `${environment.apiUrl}/api/admin`;

/**
 * Dernière valeur chargée d'une ressource, conservée pendant le chargement
 * suivant (changement de filtre, de page, rechargement) : la liste reste
 * affichée, atténuée, au lieu de disparaître derrière un squelette.
 * Ne relit la valeur que lorsque la ressource en a une (value() lève une
 * erreur si la ressource est en échec).
 */
export function derniereValeur<T>(ressource: HttpResourceRef<T | undefined>): WritableSignal<T | undefined> {
  return linkedSignal<T | undefined, T | undefined>({
    source: () => (ressource.hasValue() ? ressource.value() : undefined),
    computation: (valeur, precedent) => valeur ?? precedent?.value,
  });
}

/** Paramètres de requête, sans les valeurs vides. */
export function sansVides(valeurs: Record<string, string | number | null | undefined>): Record<string, string | number> {
  const resultat: Record<string, string | number> = {};
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if (valeur !== undefined && valeur !== null && valeur !== '') resultat[cle] = valeur;
  }
  return resultat;
}

/**
 * Recharge [ressource] à chaque événement temps réel du back-office (nouvelle
 * commande, signalement…), pour que la liste affichée reste à jour sans
 * action de l'administrateur. À appeler dans un initialiseur de champ.
 */
export function rechargerEnDirect(ressource: { reload(): unknown }): void {
  const notifications = inject(NotificationsService);
  let premier = true;
  effect(() => {
    notifications.revision();
    if (premier) {
      premier = false;
      return;
    }
    untracked(() => ressource.reload());
  });
}
