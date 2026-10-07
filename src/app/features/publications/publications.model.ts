import type { Personne } from '../../core/models/common.model';

export type StatutPublication = 'PUBLIEE' | 'SIGNALEE' | 'MASQUEE' | 'ARCHIVEE';

// ── Communauté ────────────────────────────────────────────────────────────

export interface PublicationAdmin {
  id: number;
  titre: string | null;
  contenu: string | null;
  categorie: string | null;
  auteur: Personne | null;
  mediaUrls: string[];
  audioUrl: string | null;
  statut: StatutPublication;
  nbSignalements: number;
  likes: number;
  commentaires: number;
  datePublication: string;
}

export interface CommentaireAdmin {
  id: number;
  texte: string;
  auteur: Personne | null;
  date: string;
}
