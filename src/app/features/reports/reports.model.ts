import type { StatutPublication } from '../publications/publications.model';

export interface SignalementAdmin {
  publicationId: number;
  titre: string | null;
  extrait: string;
  auteur: string | null;
  auteurId: number | null;
  media: string | null;
  nbSignalements: number;
  statut: StatutPublication;
  datePublication: string;
  motifs: { motif: string; nombre: number }[];
}

export interface SignalementDetail {
  auteur: string;
  auteurId: number;
  motif: string;
  details: string | null;
  date: string;
}
