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

/** Les nouvelles inscriptions sont des membres, même si l'API garde l'ancien libellé. */
export function texteActivite(type: TypeActivite, texte: string): string {
  if (type !== 'INSCRIPTION') return texte;
  return texte.replace(/\bacheteurs?\b/gi, (mot) => {
    const membre =
      mot === mot.toUpperCase()
        ? 'MEMBRE'
        : mot[0] === mot[0].toUpperCase()
          ? 'Membre'
          : 'membre';
    return membre + (/s$/i.test(mot) ? 's' : '');
  });
}

/** Chemin d'un lien d'activité, qui peut porter des paramètres (/utilisateurs?id=12). */
export function cheminLien(lien: string): string {
  return lien.split('?')[0];
}

export function parametresLien(lien: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(lien.split('?')[1] ?? ''));
}
