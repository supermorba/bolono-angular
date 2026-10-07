export type TypeActivite =
  'COMMANDE' | 'PRODUIT' | 'INSCRIPTION' | 'FORMATION' | 'COMPLETION' | 'MENTORAT';

export interface Activite {
  type: TypeActivite;
  titre: string;
  detail: string;
  date: string;
  lien: string;
}

export interface PageActivites {
  contenu: Activite[];
  page: number;
  suivante: boolean;
}
