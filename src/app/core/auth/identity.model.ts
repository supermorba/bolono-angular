export type RoleUtilisateur = 'ADMIN' | 'ARTISAN' | 'ACHETEUR';

/** Profil renvoyé par GET /api/users/me. */
export interface Profil {
  id: number;
  nom: string;
  email: string;
  photoUrl: string | null;
  telephone: string | null;
  role: RoleUtilisateur;
  dateInscription: string;
}
