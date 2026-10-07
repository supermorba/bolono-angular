import type { StatutCommande } from '../orders/orders.model';
import type { FormationStat } from '../courses/courses.model';
import type { Activite } from '../activity/activity.model';

export interface Indicateur {
  valeur: number;
  /** Évolution en % ; null quand il n'y a pas de base de comparaison. */
  evolution: number | null;
}

export interface Kpis {
  utilisateurs: Indicateur;
  produitsEnLigne: Indicateur;
  formations: Indicateur;
  commandesMois: Indicateur;
}

export interface PointInscription {
  date: string;
  artisans: number;
  acheteurs: number;
}

export interface Repartition {
  artisans: number;
  mentors: number;
  acheteurs: number;
  administrateurs: number;
  total: number;
}

export interface PointVente {
  date: string;
  montant: number;
}

export interface Ventes {
  totalMois: number;
  evolution: number | null;
  parJour: PointVente[];
  /** FCFA pour 1 €. */
  tauxEur: number;
}

export interface TopProduit {
  id: number;
  nom: string;
  categorie: string;
  image: string | null;
  quantite: number;
  revenu: number;
}

export interface CommandeResume {
  id: number;
  reference: string;
  client: string;
  produits: string;
  montant: number;
  statut: StatutCommande;
  date: string;
}

export interface Communaute {
  artisans: Indicateur;
  mentors: Indicateur;
  acheteurs: Indicateur;
}

export interface Dashboard {
  kpis: Kpis;
  inscriptions: PointInscription[];
  repartition: Repartition;
  ventes: Ventes;
  topProduits: TopProduit[];
  commandesRecentes: CommandeResume[];
  formationsTop: FormationStat[];
  activites: Activite[];
  communaute: Communaute;
}

export interface VentesPeriode {
  du: string;
  au: string;
  total: number;
  commandes: number;
  panierMoyen: number;
  evolution: number | null;
  parJour: PointVente[];
  tauxEur: number;
}
