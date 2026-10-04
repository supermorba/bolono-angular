import { environment } from '../../environments/environment';
import type { EtatFonds, StatutCommande, StatutTransaction } from './models';

const entier = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** « 3 542 600 FCFA » (espaces insécables normalisés). */
export function fcfa(montant: number): string {
  return `${entier.format(Math.round(montant)).replace(/ /g, ' ')} FCFA`;
}

export function eur(montant: number): string {
  return euro.format(montant).replace(/ /g, ' ');
}

export function nombre(n: number): string {
  return entier.format(n).replace(/ /g, ' ');
}

/** Montant compact pour les axes : 1,2M / 850k. */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

export function dateCourte(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function dateHeure(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** « Il y a 12 min », « Il y a 3 h », « Il y a 2 j ». */
export function ilYa(iso: string | null | undefined, maintenant = Date.now()): string {
  if (!iso) return '';
  const minutes = Math.floor((maintenant - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `Il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 30) return `Il y a ${jours} j`;
  return dateCourte(iso);
}

/**
 * URL affichable d'un média stocké par le backend : chemin relatif
 * /api/uploads/view?…, URL absolue, ou objectKey brut (comme l'app mobile,
 * cf. AppConfig.resolveMediaUrl).
 */
export function mediaUrl(url: string | null | undefined, bucketParDefaut = 'bolono-publications'): string | null {
  if (!url || !url.trim()) return null;
  const valeur = url.trim();
  const base = environment.apiUrl.replace(/\/+$/, '');
  const vue = valeur.indexOf('/api/uploads/view');
  if (vue !== -1) return base + valeur.substring(vue);
  if (/^(https?:\/\/|data:image\/)/.test(valeur)) return valeur;
  if (valeur.startsWith('/')) return base + valeur;
  return `${base}/api/uploads/view?bucket=${bucketParDefaut}&key=${encodeURIComponent(valeur)}`;
}

export const LIBELLES_COMMANDE: Record<StatutCommande, string> = {
  EN_ATTENTE: 'En attente',
  PAYEE: 'Payée',
  EXPEDIEE: 'Expédiée',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

export const LIBELLES_ROLE: Record<string, string> = {
  ADMIN: 'Administrateur',
  ARTISAN: 'Artisan',
  ACHETEUR: 'Acheteur',
  MENTOR: 'Mentor',
};

export function initiales(nom: string | null | undefined): string {
  if (!nom) return '?';
  const mots = nom.trim().split(/\s+/);
  return ((mots[0]?.[0] ?? '') + (mots.length > 1 ? mots[mots.length - 1][0] : '')).toUpperCase();
}

// ── Transactions sécurisées ─────────────────────────────────────────────────

export const LIBELLES_TRANSACTION: Record<StatutTransaction, string> = {
  CREEE: 'En attente',
  PAYEE: 'Payée',
  ACCEPTEE: 'En préparation',
  EXPEDIEE: 'Expédiée',
  REMISE: 'Remise (inspection)',
  EN_LITIGE: 'Litige',
  LIVREE: 'Livrée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
  REMBOURSEE: 'Remboursée',
};

export const LIBELLES_FONDS: Record<EtatFonds, string> = {
  HORS_SEQUESTRE: 'Payé à la livraison',
  EN_ATTENTE: 'Paiement attendu',
  BLOQUES: 'Bloqués',
  LIBERES: 'À verser au vendeur',
  VERSES: 'Versés au vendeur',
  A_REMBOURSER: 'À rembourser',
  REMBOURSES: 'Remboursés',
};

export const LIBELLES_ACTION_TRANSACTION: Record<string, string> = {
  CREER: 'Commande passée',
  CONFIRMER_PAIEMENT: 'Paiement reçu',
  GENERER_CODE: 'Code de remise affiché',
  ACCEPTER: 'Acceptée par le vendeur',
  REFUSER: 'Refusée par le vendeur',
  ANNULER: "Annulée par l'acheteur",
  EXPEDIER: 'Expédiée',
  VALIDER_CODE: 'Remise prouvée par le code',
  CONFIRMER_RECEPTION: "Réception confirmée par l'acheteur",
  OUVRIR_LITIGE: 'Litige ouvert',
  REPONDRE_LITIGE: 'Version du vendeur envoyée',
  TRANCHER_LITIGE: 'Litige tranché',
  EXPIRER: 'Annulée : délai dépassé',
  CONFIRMER_D_OFFICE: 'Livrée d’office (délai écoulé)',
  MARQUER_REMBOURSE: 'Remboursement effectué',
  MARQUER_VERSE: 'Versement effectué',
};

