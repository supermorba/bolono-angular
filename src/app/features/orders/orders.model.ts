import type { ModePaiement } from '../payments/payments.model';

export type StatutCommande = 'EN_ATTENTE' | 'PAYEE' | 'EXPEDIEE' | 'LIVREE' | 'ANNULEE';

export interface LigneAdmin {
  produit: string;
  quantite: number;
  prixUnitaire: number;
}

export type StatutLivraison = 'EN_PREPARATION' | 'EXPEDIE' | 'EN_TRANSIT' | 'LIVRE' | 'RETARDE';

export interface PaiementAdmin {
  mode: ModePaiement | null;
  reference: string | null;
  valide: boolean | null;
  date: string | null;
}

export interface LivraisonAdmin {
  numeroSuivi: string | null;
  statut: StatutLivraison | null;
  dateExpedition: string | null;
  dateLivraisonEstimee: string | null;
  dateLivraisonReelle: string | null;
}

export interface CommandeAdmin {
  id: number;
  reference: string;
  client: string;
  clientEmail: string | null;
  adresse: string;
  lignes: LigneAdmin[];
  montant: number;
  statut: StatutCommande;
  date: string;
  paiement: PaiementAdmin | null;
  livraison: LivraisonAdmin | null;
}
