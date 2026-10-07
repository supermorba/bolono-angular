// ── Annonces ──────────────────────────────────────────────────────────────

export type AudienceAnnonce = 'TOUS' | 'ARTISANS' | 'MENTORS' | 'ACHETEURS';

export type PrioriteAnnonce = 'INFO' | 'IMPORTANT';

export interface AnnonceAdmin {
  id: number;
  titre: string;
  message: string;
  lien: string | null;
  imageUrl: string | null;
  audience: AudienceAnnonce;
  priorite: PrioriteAnnonce;
  datePublication: string;
  dateExpiration: string | null;
  retiree: boolean;
  active: boolean;
  envoyerPush: boolean;
  pushEnvoyes: number | null;
  lectures: number;
  audienceTotale: number;
  auteur: string | null;
}

export interface AnnonceRequest {
  titre: string;
  message: string;
  lien: string | null;
  imageUrl: string | null;
  audience: AudienceAnnonce;
  priorite: PrioriteAnnonce;
  dateExpiration: string | null;
  envoyerPush: boolean;
}
