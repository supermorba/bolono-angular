import type { RoleUtilisateur } from '../../core/auth/identity.model';
import type { StatutCandidature } from '../mentorship/mentorship.model';

export interface UtilisateurAdmin {
  id: number;
  nom: string;
  email: string;
  telephone: string | null;
  photoUrl: string | null;
  role: RoleUtilisateur;
  mentor: boolean;
  specialite: string | null;
  ville: string | null;
  dateInscription: string;
  suspendu: boolean;
  /** Boutique du compte (capacité vendeur), null s'il n'en a pas. */
  boutiqueId: number | null;
}

export interface CompteursUtilisateurs {
  tous: number;
  artisans: number;
  vendeurs: number;
  mentors: number;
  acheteurs: number;
  administrateurs: number;
  suspendus: number;
}

export interface ActiviteUtilisateur {
  publications: number;
  produits: number;
  commandes: number;
  totalDepense: number;
  formationsPubliees: number;
  formationsSuivies: number;
  abonnes: number;
}

export interface UtilisateurDetail {
  profil: UtilisateurAdmin;
  commune: string | null;
  biographie: string | null;
  adresseAtelier: string | null;
  lienWhatsapp: string | null;
  domaineExpertise: string | null;
  motifSuspension: string | null;
  dateSuspension: string | null;
  /** Type de compte hors accès admin ; null pour un compte créé comme administrateur. */
  profilDeBase: 'ARTISAN' | 'ACHETEUR' | null;
  candidatureMentor: StatutCandidature | null;
  activite: ActiviteUtilisateur;
  /** Nom de sa boutique (null s'il n'en a pas). */
  boutique: string | null;
}

export interface SuspensionResultat {
  utilisateur: UtilisateurDetail;
  /** false : Firebase n'a pas pu être mis à jour (l'API bloque quand même le compte). */
  firebaseMisAJour: boolean;
}
