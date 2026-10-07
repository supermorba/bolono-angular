import type { Personne } from '../../core/models/common.model';

export interface StatutMentorAdmin {
  id: number;
  type: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  legende: string | null;
  auteur: Personne | null;
  dateCreation: string;
  dateExpiration: string;
  actif: boolean;
  vues: number;
}
