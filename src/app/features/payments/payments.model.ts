// ── Transactions sécurisées ─────────────────────────────────────────────────
// Une commande donne une transaction par vendeur ; le vendeur la gère, l'équipe
// rapproche les paiements, tranche les litiges, rembourse et verse.

export type ModePaiement = 'ORANGE_MONEY' | 'WAVE' | 'CARTE_BANCAIRE' | 'PAYPAL' | 'A_LA_LIVRAISON';

export type StatutTransaction =
  | 'CREEE'
  | 'PAYEE'
  | 'ACCEPTEE'
  | 'EXPEDIEE'
  | 'REMISE'
  | 'EN_LITIGE'
  | 'LIVREE'
  | 'REFUSEE'
  | 'ANNULEE'
  | 'REMBOURSEE';

export type EtatFonds =
  | 'HORS_SEQUESTRE'
  | 'EN_ATTENTE'
  | 'BLOQUES'
  | 'LIBERES'
  | 'VERSES'
  | 'A_REMBOURSER'
  | 'REMBOURSES';

export type DecisionLitige = 'EN_FAVEUR_ACHETEUR' | 'EN_FAVEUR_VENDEUR';

export interface PartieTransaction {
  id: string;
  nom: string;
  telephone: string | null;
}

export interface EvenementTransaction {
  date: string;
  action: string;
  statutAvant: StatutTransaction | null;
  statut: StatutTransaction;
  role: 'ACHETEUR' | 'VENDEUR' | 'ARBITRE' | 'SYSTEME';
  commentaire: string | null;
}

export interface TransactionAdmin {
  reference: string;
  referenceExterne: string | null;
  acheteur: PartieTransaction;
  vendeur: PartieTransaction;
  articles: { libelle: string; quantite: number; prixUnitaire: number; sousTotal: number }[];
  montant: number;
  commission: number;
  montantVendeur: number;
  adresseLivraison: string;
  mode: 'SEQUESTRE' | 'A_LA_LIVRAISON';
  statut: StatutTransaction;
  fonds: EtatFonds;
  referencePaiement: string | null;
  transporteur: string | null;
  numeroSuivi: string | null;
  /** Photo du colis prise par le vendeur à l'expédition. */
  photoExpedition: string | null;
  /** Où verser la part du vendeur (ex. « WAVE +223… »), null s'il ne l'a pas renseigné. */
  compteVersementVendeur: string | null;
  motif: string | null;
  echeance: string | null;
  creeeLe: string;
  clotureeLe: string | null;
  referenceRemboursement: string | null;
  referenceVersement: string | null;
  litige: {
    motif: string;
    description: string | null;
    preuvesAcheteur: string[];
    ouvertLe: string;
    reponseVendeur: string | null;
    preuvesVendeur: string[];
    reponduLe: string | null;
    decision: DecisionLitige | null;
    commentaireDecision: string | null;
  } | null;
  journal: EvenementTransaction[];
}

export interface PaiementEnAttente {
  reference: string;
  montant: number;
  moyen: string | null;
  acheteur: PartieTransaction | null;
  creeLe: string;
  transactions: string[];
}

/** Synthèse des paiements, litiges et fonds bloqués pour le tableau de bord. */
export interface SyntheseVentes {
  paiementsAConfirmer: number;
  litigesEnCours: number;
  aRembourser: number;
  aVerser: number;
  /** Payé par les acheteurs et bloqué jusqu'à la remise prouvée. */
  montantBloque: number;
  /** Dû aux vendeurs (commission déduite). */
  montantAVerser: number;
  montantARembourser: number;
  commissionsAcquises: number;
}
