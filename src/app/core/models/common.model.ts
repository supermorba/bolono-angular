/**
 * Contrats d'échange avec l'API d'administration
 * (spring/.../dto/admin/AdminDtos.java et DTO existants).
 */

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface Personne {
  id: number;
  nom: string;
  photoUrl: string | null;
}

/**
 * Choix de l'administrateur pour une action qui touche un utilisateur :
 * le prévenir (par défaut) et, s'il le souhaite, préciser pourquoi.
 */
export interface OptionsNotification {
  notifier: boolean;
  motif: string | null;
}
