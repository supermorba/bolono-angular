// ── Boutiques ────────────────────────────────────────────────────────────────

/** OUVERTE / FERMEE : choix du vendeur ; MASQUEE : décision de l'équipe. */
export type StatutBoutique = 'OUVERTE' | 'FERMEE' | 'MASQUEE';

export interface BoutiqueAdmin {
  id: number;
  nom: string;
  categorie: string | null;
  ville: string | null;
  logoUrl: string | null;
  statut: StatutBoutique;
  proprietaireId: number;
  proprietaire: string;
  proprietaireEmail: string | null;
  proprietaireSuspendu: boolean;
  produits: number;
  produitsEnLigne: number;
  /** Commandes payées, expédiées ou livrées ; chiffre d'affaires en FCFA. */
  ventes: number;
  chiffreAffaires: number;
  dateCreation: string;
}

export interface BoutiqueAdminDetail {
  boutique: BoutiqueAdmin;
  description: string | null;
  banniereUrl: string | null;
  adresse: string | null;
  telephone: string | null;
  lienWhatsapp: string | null;
  moyenVersement: string | null;
  numeroVersement: string | null;
  motifMasquage: string | null;
  dateMasquage: string | null;
}

export interface CompteursBoutiques {
  toutes: number;
  ouvertes: number;
  fermees: number;
  masquees: number;
}
