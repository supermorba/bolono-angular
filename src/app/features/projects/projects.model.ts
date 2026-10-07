import type { Personne } from '../../core/models/common.model';

export type StatutProjet = 'OUVERT' | 'TERMINE' | 'ANNULE';

export interface ProjetAdmin {
  id: number;
  titre: string;
  description: string;
  statut: StatutProjet;
  ville: string | null;
  budget: number;
  artisansRequis: number;
  participants: number;
  candidaturesEnAttente: number;
  initiateur: Personne | null;
  metiers: string[];
  photo: string | null;
  dateCreation: string;
  dateLimiteCandidature: string | null;
}

export interface ParticipationAdmin {
  id: number;
  artisan: Personne | null;
  role: string | null;
  message: string | null;
  statut: 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE' | null;
  dateDemande: string;
}

export interface ProjetDetailAdmin {
  projet: ProjetAdmin;
  photos: string[];
  audioUrl: string | null;
  communeOuQuartier: string | null;
  participations: ParticipationAdmin[];
}
