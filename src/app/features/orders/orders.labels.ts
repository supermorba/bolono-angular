import type { StatutCommande, StatutLivraison } from './orders.model';
import type { Ton } from '../../shared/models/ui.model';

export const LIBELLES_COMMANDE: Record<StatutCommande, string> = {
  EN_ATTENTE: 'En attente',
  PAYEE: 'Payée',
  EXPEDIEE: 'Expédiée',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

export const TON_COMMANDE: Record<StatutCommande, Ton> = {
  EN_ATTENTE: 'attention',
  PAYEE: 'info',
  EXPEDIEE: 'accent',
  LIVREE: 'succes',
  ANNULEE: 'erreur',
};

/** Livraison renseignée sur les commandes antérieures aux transactions sécurisées. */
export const LIBELLES_LIVRAISON: Record<StatutLivraison, string> = {
  EN_PREPARATION: 'En préparation',
  EXPEDIE: 'Expédiée',
  EN_TRANSIT: 'En transit',
  LIVRE: 'Livrée',
  RETARDE: 'Retardée',
};
