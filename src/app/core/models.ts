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

export interface Indicateur {
  valeur: number;
  /** Évolution en % ; null quand il n'y a pas de base de comparaison. */
  evolution: number | null;
}

export interface Kpis {
  utilisateurs: Indicateur;
  produitsEnLigne: Indicateur;
  formations: Indicateur;
  commandesMois: Indicateur;
}

export interface PointInscription {
  date: string;
  artisans: number;
  acheteurs: number;
}

export interface Repartition {
  artisans: number;
  mentors: number;
  acheteurs: number;
  administrateurs: number;
  total: number;
}

export interface PointVente {
  date: string;
  montant: number;
}

export interface Ventes {
  totalMois: number;
  evolution: number | null;
  parJour: PointVente[];
  /** FCFA pour 1 €. */
  tauxEur: number;
}

export interface TopProduit {
  id: number;
  nom: string;
  categorie: string;
  image: string | null;
  quantite: number;
  revenu: number;
}

export type StatutCommande = 'EN_ATTENTE' | 'PAYEE' | 'EXPEDIEE' | 'LIVREE' | 'ANNULEE';

export interface CommandeResume {
  id: number;
  reference: string;
  client: string;
  produits: string;
  montant: number;
  statut: StatutCommande;
  date: string;
}

export interface FormationStat {
  id: number;
  titre: string;
  categorie: string;
  niveau: string | null;
  miniature: string | null;
  auteur: string | null;
  modules: number;
  apprenants: number;
  termines: number;
  tauxCompletion: number;
  dateCreation: string | null;
}

export type TypeActivite = 'COMMANDE' | 'PRODUIT' | 'INSCRIPTION' | 'FORMATION' | 'COMPLETION' | 'MENTORAT';

export interface Activite {
  type: TypeActivite;
  titre: string;
  detail: string;
  date: string;
  lien: string;
}

export interface Communaute {
  artisans: Indicateur;
  mentors: Indicateur;
  acheteurs: Indicateur;
}

export interface Dashboard {
  kpis: Kpis;
  inscriptions: PointInscription[];
  repartition: Repartition;
  ventes: Ventes;
  topProduits: TopProduit[];
  commandesRecentes: CommandeResume[];
  formationsTop: FormationStat[];
  activites: Activite[];
  communaute: Communaute;
}

export interface Notifications {
  candidaturesEnAttente: number;
  produitsEnAttente: number;
  publicationsSignalees: number;
}

export type RoleUtilisateur = 'ADMIN' | 'ARTISAN' | 'ACHETEUR';

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
}

export interface CompteursUtilisateurs {
  tous: number;
  artisans: number;
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
}

export interface SuspensionResultat {
  utilisateur: UtilisateurDetail;
  /** false : Firebase n'a pas pu être mis à jour (l'API bloque quand même le compte). */
  firebaseMisAJour: boolean;
}

export type StatutProduit = 'EN_ATTENTE' | 'EN_LIGNE' | 'REFUSE';

export type TypeProduit = 'PRODUIT_FINI' | 'MATIERE_PREMIERE';

export interface ProduitAdmin {
  id: number;
  nom: string;
  description: string | null;
  type: TypeProduit | null;
  /** Catégorie de la boutique (Tissage, Poterie…), null si non renseignée. */
  categorie: string | null;
  prixFCFA: number;
  prixEUR: number | null;
  stock: number | null;
  uniteMesure: string | null;
  images: string[];
  statut: StatutProduit;
  vendeur: string | null;
  dateCreation: string | null;
  ventes: number;
}

export interface LigneAdmin {
  produit: string;
  quantite: number;
  prixUnitaire: number;
}

export type ModePaiement = 'ORANGE_MONEY' | 'WAVE' | 'CARTE_BANCAIRE' | 'PAYPAL' | 'A_LA_LIVRAISON';
export type StatutLivraison = 'EN_PREPARATION' | 'EXPEDIE' | 'EN_TRANSIT' | 'LIVRE' | 'RETARDE';

export interface PaiementAdmin {
  mode: ModePaiement | null;
  reference: string | null;
  valide: boolean | null;
  date: string | null;
}

export interface LivraisonAdmin {
  numeroSuivi: string | null;
  statut: StatutLivraison | null;
  dateExpedition: string | null;
  dateLivraisonEstimee: string | null;
  dateLivraisonReelle: string | null;
}

export interface CommandeAdmin {
  id: number;
  reference: string;
  client: string;
  clientEmail: string | null;
  adresse: string;
  lignes: LigneAdmin[];
  montant: number;
  statut: StatutCommande;
  date: string;
  paiement: PaiementAdmin | null;
  livraison: LivraisonAdmin | null;
}

export type StatutPublication = 'PUBLIEE' | 'SIGNALEE' | 'MASQUEE' | 'ARCHIVEE';

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

export interface ResultatsRecherche {
  utilisateurs: UtilisateurAdmin[];
  produits: ProduitAdmin[];
  formations: FormationStat[];
}

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

// ── Gestion : formations, quiz, badges ────────────────────────────────────

export interface Personne {
  id: number;
  nom: string;
  photoUrl: string | null;
}

export interface QuizResume {
  id: number;
  titre: string;
  questions: number;
  scoreMinimum: number;
  badge: string | null;
  tentatives: number;
  reussites: number;
}

export interface ModuleAdmin {
  id: number;
  titre: string;
  description: string | null;
  urlVideo: string;
  dureeSecondes: number;
  ordre: number;
  disponibleHorsLigne: boolean;
  termines: number;
  quiz: QuizResume | null;
}

export interface FormationDetailAdmin {
  id: number;
  titre: string;
  description: string | null;
  categorie: string;
  niveau: string | null;
  miniatureUrl: string | null;
  auteur: Personne | null;
  dateCreation: string | null;
  dureeTotaleSecondes: number;
  apprenants: number;
  termines: number;
  tauxCompletion: number;
  modules: ModuleAdmin[];
}

export interface FormationRequest {
  titre: string;
  description: string | null;
  categorie: string;
  niveau: string | null;
  miniatureUrl: string | null;
  auteurId: number | null;
}

export interface ModuleRequest {
  titre: string;
  description: string | null;
  urlVideo: string;
  dureeSecondes: number;
  disponibleHorsLigne: boolean;
}

export type TypeQuestion = 'CHOIX_UNIQUE' | 'CHOIX_MULTIPLE' | 'VRAI_FAUX';

export interface ReponseQuiz {
  id?: number | null;
  texte: string;
  estCorrecte: boolean;
  explication?: string | null;
}

export interface QuestionQuiz {
  id?: number | null;
  intitule: string;
  explication: string | null;
  points: number;
  type: TypeQuestion;
  reponses: ReponseQuiz[];
}

export interface QuizAdmin {
  id: number;
  titre: string;
  description: string | null;
  scoreMinimum: number;
  dureeMinutes: number | null;
  nbTentativesMax: number | null;
  estObligatoire: boolean;
  badgeId: number | null;
  tentatives: number;
  questionsModifiables: boolean;
  questions: QuestionQuiz[];
}

export interface BadgeAdmin {
  id: number;
  intitule: string;
  description: string | null;
  urlIcone: string | null;
  categorie: string | null;
  obtentions: number;
  quiz: number;
}

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

// ── Tableau de bord ───────────────────────────────────────────────────────

export interface PageActivites {
  contenu: Activite[];
  page: number;
  suivante: boolean;
}

export interface VentesPeriode {
  du: string;
  au: string;
  total: number;
  commandes: number;
  panierMoyen: number;
  evolution: number | null;
  parJour: PointVente[];
  tauxEur: number;
}

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

// ── Plateforme ────────────────────────────────────────────────────────────

export type TypeCategorie = 'PRODUIT' | 'FORMATION' | 'PUBLICATION';

export interface CategorieAdmin {
  id: number;
  type: TypeCategorie;
  nom: string;
  icone: string | null;
  ordre: number;
  active: boolean;
  utilisations: number;
}

export type CleParametre =
  | 'CONTACT_EMAIL'
  | 'CONTACT_TELEPHONE'
  | 'CONTACT_WHATSAPP'
  | 'MESSAGE_ACCUEIL'
  | 'A_PROPOS'
  | 'CONDITIONS_UTILISATION'
  | 'POLITIQUE_CONFIDENTIALITE'
  | 'PAIEMENT_ORANGE_MONEY'
  | 'PAIEMENT_WAVE';

export interface ParametreAdmin {
  cle: CleParametre;
  libelle: string;
  description: string;
  format: 'TEXTE_COURT' | 'TEXTE_LONG' | 'EMAIL' | 'TELEPHONE';
  publique: boolean;
  valeur: string | null;
  dateModification: string | null;
}

/** Catégories de fichiers téléversables depuis le back-office. */
export type CategorieFichier =
  | 'FORMATION_BANNIERE'
  | 'FORMATION_COURS'
  | 'PRODUIT_IMAGE'
  | 'BADGE_ICONE'
  | 'ANNONCE_IMAGE'
  | 'PUBLICATION_IMAGE';

/** Événement temps réel du back-office (canal /topic/admin.evenements). */
export interface EvenementAdmin {
  type: 'CANDIDATURE_MENTOR' | 'SIGNALEMENT' | 'PRODUIT' | 'COMMANDE';
  message: string;
  date: string;
}

/**
 * Choix de l'administrateur pour une action qui touche un utilisateur :
 * le prévenir (par défaut) et, s'il le souhaite, préciser pourquoi.
 */
export interface OptionsNotification {
  notifier: boolean;
  motif: string | null;
}

// ── Transactions sécurisées ─────────────────────────────────────────────────
// Une commande donne une transaction par vendeur ; le vendeur la gère, l'équipe
// rapproche les paiements, tranche les litiges, rembourse et verse.

export type StatutTransaction =
  | 'CREEE' | 'PAYEE' | 'ACCEPTEE' | 'EXPEDIEE' | 'REMISE' | 'EN_LITIGE'
  | 'LIVREE' | 'REFUSEE' | 'ANNULEE' | 'REMBOURSEE';

export type EtatFonds =
  | 'HORS_SEQUESTRE' | 'EN_ATTENTE' | 'BLOQUES' | 'LIBERES' | 'VERSES' | 'A_REMBOURSER' | 'REMBOURSES';

export type DecisionLitige = 'EN_FAVEUR_ACHETEUR' | 'EN_FAVEUR_VENDEUR';

export interface PartieTransaction {
  id: string;
  nom: string;
  telephone: string | null;
}

export interface EvenementTransaction {
  date: string;
  action: string;
  statutAvant: StatutTransaction | null;
  statut: StatutTransaction;
  role: 'ACHETEUR' | 'VENDEUR' | 'ARBITRE' | 'SYSTEME';
  commentaire: string | null;
}

export interface TransactionAdmin {
  reference: string;
  referenceExterne: string | null;
  acheteur: PartieTransaction;
  vendeur: PartieTransaction;
  articles: { libelle: string; quantite: number; prixUnitaire: number; sousTotal: number }[];
  montant: number;
  commission: number;
  montantVendeur: number;
  adresseLivraison: string;
  mode: 'SEQUESTRE' | 'A_LA_LIVRAISON';
  statut: StatutTransaction;
  fonds: EtatFonds;
  referencePaiement: string | null;
  transporteur: string | null;
  numeroSuivi: string | null;
  /** Photo du colis prise par le vendeur à l'expédition. */
  photoExpedition: string | null;
  /** Où verser la part du vendeur (ex. « WAVE +223… »), null s'il ne l'a pas renseigné. */
  compteVersementVendeur: string | null;
  motif: string | null;
  echeance: string | null;
  creeeLe: string;
  clotureeLe: string | null;
  referenceRemboursement: string | null;
  referenceVersement: string | null;
  litige: {
    motif: string;
    description: string | null;
    preuvesAcheteur: string[];
    ouvertLe: string;
    reponseVendeur: string | null;
    preuvesVendeur: string[];
    reponduLe: string | null;
    decision: DecisionLitige | null;
    commentaireDecision: string | null;
  } | null;
  journal: EvenementTransaction[];
}

export interface PaiementEnAttente {
  reference: string;
  montant: number;
  moyen: string | null;
  acheteur: PartieTransaction | null;
  creeLe: string;
  transactions: string[];
}

