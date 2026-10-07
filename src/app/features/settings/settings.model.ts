/** Règles en vigueur, fixées dans la configuration du serveur (lecture seule). */
export interface ReglesVentes {
  delaiPaiementHeures: number;
  delaiAcceptationHeures: number;
  delaiExpeditionHeures: number;
  delaiConfirmationHeures: number;
  delaiInspectionHeures: number;
  commissionPourMille: number;
  maxEnAttenteParAcheteur: number;
  rappelAvantHeures: number;
}

// ── Plateforme ────────────────────────────────────────────────────────────

export type TypeCategorie = 'PRODUIT' | 'FORMATION' | 'PUBLICATION';

export interface CategorieAdmin {
  id: number;
  type: TypeCategorie;
  nom: string;
  icone: string | null;
  ordre: number;
  active: boolean;
  utilisations: number;
}

export type CleParametre =
  | 'CONTACT_EMAIL'
  | 'CONTACT_TELEPHONE'
  | 'CONTACT_WHATSAPP'
  | 'MESSAGE_ACCUEIL'
  | 'A_PROPOS'
  | 'CONDITIONS_UTILISATION'
  | 'POLITIQUE_CONFIDENTIALITE'
  | 'PAIEMENT_ORANGE_MONEY'
  | 'PAIEMENT_WAVE';

export interface ParametreAdmin {
  cle: CleParametre;
  libelle: string;
  description: string;
  format: 'TEXTE_COURT' | 'TEXTE_LONG' | 'EMAIL' | 'TELEPHONE';
  publique: boolean;
  valeur: string | null;
  dateModification: string | null;
}
