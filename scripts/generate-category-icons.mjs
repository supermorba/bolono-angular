// Palette d'icônes des catégories : source unique pour le back-office, l'application
// mobile et l'API. Pour ajouter une icône, l'ajouter à PALETTE puis relancer :
//   node scripts/generate-category-icons.mjs
//
// Génère :
//  - src/app/shared/icones-categories.ts            (back-office : sélecteur et aperçu)
//  - ../../flutter/assets/icons/categories/<clé>.svg (application : icônes embarquées)
//  - ../../flutter/lib/core/design_system/icons/category_icons.dart (clés connues de l'app)
//  - ../../spring/bolono/.../domain/plateforme/IconesCategorie.java (clés acceptées par l'API)
//
// Icônes Phosphor (MIT), graisse « regular », viewBox 0 0 256 256. Le nom Phosphor
// sert de clé : c'est ce qui est enregistré dans la colonne categories.icone.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PALETTE = [
  // Textile et vêtement
  ['yarn', 'Pelote'],
  ['needle', 'Aiguille'],
  ['scissors', 'Ciseaux'],
  ['t-shirt', 'Vêtement'],
  ['dress', 'Robe'],
  ['coat-hanger', 'Cintre'],
  // Couleur et peinture
  ['drop', 'Teinture'],
  ['paint-bucket', 'Bain de teinture'],
  ['paint-brush', 'Pinceau'],
  ['palette', 'Palette'],
  // Terre, bois, métal
  ['jar', 'Jarre'],
  ['cooking-pot', 'Marmite'],
  ['bowl-food', 'Bol'],
  ['mask-happy', 'Masque'],
  ['tree', 'Bois'],
  ['axe', 'Hache'],
  ['armchair', 'Mobilier'],
  ['hammer', 'Marteau'],
  ['flame', 'Forge'],
  ['knife', 'Couteau'],
  // Parure et accessoires
  ['diamond', 'Bijou'],
  ['crown', 'Couronne'],
  ['sparkle', 'Éclat'],
  ['handbag', 'Sac'],
  ['boot', 'Botte'],
  ['sneaker', 'Chaussure'],
  ['basket', 'Panier'],
  // Nature, musique, divers
  ['leaf', 'Feuille'],
  ['flower-lotus', 'Fleur'],
  ['music-notes', 'Musique'],
  ['pen-nib', 'Calligraphie'],
  ['camera', 'Photo'],
  ['gift', 'Cadeau'],
  ['tag', 'Autre'],
];

// fileURLToPath : le chemin du projet contient un espace (« Bolono Project »).
const RACINE = fileURLToPath(new URL('../../../', import.meta.url));
const svg = (cle) =>
  readFileSync(`node_modules/@phosphor-icons/core/assets/regular/${cle}.svg`, 'utf8').trim();
const interieur = (cle) =>
  svg(cle).replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();

// 1. Back-office
writeFileSync(
  'src/app/shared/icones-categories.ts',
  `// Fichier généré par scripts/generate-category-icons.mjs — ne pas modifier à la main.
// Palette d'icônes des catégories (Phosphor, MIT), viewBox 0 0 256 256.
export interface IconeCategorie {
  cle: string;
  libelle: string;
  svg: string;
}

export const ICONES_CATEGORIES: IconeCategorie[] = [
${PALETTE.map(([cle, libelle]) => `  { cle: '${cle}', libelle: '${libelle.replace(/'/g, "\\'")}', svg: '${interieur(cle).replace(/'/g, "\\'")}' },`).join('\n')}
];
`,
);

// 2. Application : un SVG par icône (les anciens sont retirés)
const dossier = `${RACINE}flutter/assets/icons/categories`;
mkdirSync(dossier, { recursive: true });
for (const fichier of readdirSync(dossier)) rmSync(`${dossier}/${fichier}`);
for (const [cle] of PALETTE) writeFileSync(`${dossier}/${cle}.svg`, `${svg(cle)}\n`);

writeFileSync(
  `${RACINE}flutter/lib/core/design_system/icons/category_icons.dart`,
  `// Fichier généré par angular/bolono/scripts/generate-category-icons.mjs — ne pas modifier à la main.

/// Icônes de catégorie embarquées dans l'application (clé → libellé). La clé
/// est celle choisie dans le back-office ; le fichier est
/// \`assets/icons/categories/<clé>.svg\`.
const Map<String, String> categoryIconLabels = {
${PALETTE.map(([cle, libelle]) => `  '${cle}': '${libelle.replace(/'/g, "\\'")}',`).join('\n')}
};
`,
);

// 3. API
writeFileSync(
  `${RACINE}spring/bolono/src/main/java/com/example/bolono/domain/plateforme/IconesCategorie.java`,
  `// Fichier généré par angular/bolono/scripts/generate-category-icons.mjs — ne pas modifier à la main.
package com.example.bolono.domain.plateforme;

import java.util.List;

/** Icônes de catégorie connues du back-office et de l'application (noms Phosphor). */
public final class IconesCategorie {

    public static final List<String> CLES = List.of(
${PALETTE.map(([cle]) => `            "${cle}"`).join(',\n')});

    private IconesCategorie() {
    }
}
`,
);

console.log(`${PALETTE.length} icônes de catégorie générées`);
