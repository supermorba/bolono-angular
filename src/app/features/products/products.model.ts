/** Pas de validation : un produit est en ligne dès sa création, l'équipe peut le masquer. */
export type StatutProduit = 'EN_LIGNE' | 'MASQUE';

export type TypeProduit = 'PRODUIT_FINI' | 'MATIERE_PREMIERE';

export interface ProduitAdmin {
  id: number;
  nom: string;
  description: string | null;
  type: TypeProduit | null;
  /** Catégorie de la boutique (Tissage, Poterie…), null si non renseignée. */
  categorie: string | null;
  prixFCFA: number;
  prixEUR: number | null;
  stock: number | null;
  uniteMesure: string | null;
  images: string[];
  statut: StatutProduit;
  vendeur: string | null;
  dateCreation: string | null;
  ventes: number;
}
