import type { EtatFonds, ModePaiement, StatutTransaction } from './payments.model';
import type { Ton } from '../../shared/models/ui.model';

export const LIBELLES_PAIEMENT: Record<ModePaiement, string> = {
  ORANGE_MONEY: 'Orange Money',
  WAVE: 'Wave',
  CARTE_BANCAIRE: 'Carte bancaire',
  PAYPAL: 'PayPal',
  A_LA_LIVRAISON: 'À la livraison',
};

export const LIBELLES_TRANSACTION: Record<StatutTransaction, string> = {
  CREEE: 'En attente',
  PAYEE: 'Payée',
  ACCEPTEE: 'En préparation',
  EXPEDIEE: 'Expédiée',
  REMISE: 'Remise (inspection)',
  EN_LITIGE: 'Litige',
  LIVREE: 'Livrée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
  REMBOURSEE: 'Remboursée',
};

export const LIBELLES_FONDS: Record<EtatFonds, string> = {
  HORS_SEQUESTRE: 'Payé à la livraison',
  EN_ATTENTE: 'Paiement attendu',
  BLOQUES: 'Bloqués',
  LIBERES: 'À verser au vendeur',
  VERSES: 'Versés au vendeur',
  A_REMBOURSER: 'À rembourser',
  REMBOURSES: 'Remboursés',
};

export const LIBELLES_ACTION_TRANSACTION: Record<string, string> = {
  CREER: 'Commande passée',
  CONFIRMER_PAIEMENT: 'Paiement reçu',
  GENERER_CODE: 'Code de remise affiché',
  ACCEPTER: 'Acceptée par le vendeur',
  REFUSER: 'Refusée par le vendeur',
  ANNULER: "Annulée par l'acheteur",
  EXPEDIER: 'Expédiée',
  VALIDER_CODE: 'Remise prouvée par le code',
  CONFIRMER_RECEPTION: "Réception confirmée par l'acheteur",
  OUVRIR_LITIGE: 'Litige ouvert',
  REPONDRE_LITIGE: 'Version du vendeur envoyée',
  TRANCHER_LITIGE: 'Litige tranché',
  EXPIRER: 'Annulée : délai dépassé',
  CONFIRMER_D_OFFICE: 'Livrée d’office (délai écoulé)',
  MARQUER_REMBOURSE: 'Remboursement effectué',
  MARQUER_VERSE: 'Versement effectué',
};

export const TON_TRANSACTION: Record<StatutTransaction, Ton> = {
  CREEE: 'attention',
  PAYEE: 'info',
  ACCEPTEE: 'info',
  EXPEDIEE: 'accent',
  REMISE: 'accent',
  EN_LITIGE: 'erreur',
  LIVREE: 'succes',
  REFUSEE: 'neutre',
  ANNULEE: 'neutre',
  REMBOURSEE: 'neutre',
};
