import type { TypeActivite } from './activity.model';

/** Icône et couleurs de chaque type d'activité (tableau de bord, journal). */
export const STYLE_ACTIVITE: Record<TypeActivite, { icone: string; classes: string }> = {
  COMMANDE: { icone: 'shopping-cart', classes: 'bg-terracotta-light text-terracotta' },
  PRODUIT: { icone: 'package', classes: 'bg-success-surface text-success' },
  INSCRIPTION: { icone: 'user', classes: 'bg-info-surface text-info' },
  FORMATION: { icone: 'graduation-cap', classes: 'bg-[#f1ebf8] text-chart-mentor' },
  COMPLETION: { icone: 'play-circle', classes: 'bg-[#f1ebf8] text-chart-mentor' },
  MENTORAT: { icone: 'seal-check', classes: 'bg-warning-surface text-warning' },
};

/** Chemin d'un lien d'activité, qui peut porter des paramètres (/utilisateurs?id=12). */
export function cheminLien(lien: string): string {
  return lien.split('?')[0];
}

export function parametresLien(lien: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(lien.split('?')[1] ?? ''));
}
