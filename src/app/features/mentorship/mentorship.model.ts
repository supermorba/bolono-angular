export type StatutCandidature = 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE';

export interface CandidatureMentor {
  id: number;
  artisanId: number;
  artisanNom: string;
  artisanEmail: string | null;
  artisanTelephone: string | null;
  specialite: string | null;
  adresseAtelier: string | null;
  photoUrl: string | null;
  dateCandidature: string;
  statut: StatutCandidature;
  dateDecision: string | null;
  motifRefus: string | null;
  domaineExpertise: string | null;
  motivation: string | null;
  lienGroupeWhatsapp: string | null;
  anneesExperience: number | null;
  adminDecideurNom: string | null;
}
