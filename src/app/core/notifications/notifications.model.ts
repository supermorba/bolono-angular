export interface Notifications {
  candidaturesEnAttente: number;
  publicationsSignalees: number;
  /** Ventes sécurisées : paiements à rapprocher, litiges à trancher, fonds à rendre ou à verser. */
  paiementsAConfirmer: number;
  litigesEnCours: number;
  remboursementsAEffectuer: number;
  versementsAEffectuer: number;
}

/** Événement temps réel du back-office (canal /topic/admin.evenements). */
export interface EvenementAdmin {
  type: 'CANDIDATURE_MENTOR' | 'SIGNALEMENT' | 'PRODUIT' | 'COMMANDE';
  message: string;
  date: string;
}
