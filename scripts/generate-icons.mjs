// Génère src/app/shared/icons.ts à partir de @phosphor-icons/core (la même
// famille d'icônes que l'app mobile). Relancer après avoir ajouté un nom (et, s'il sert en plein, l'ajouter à PLEINES) :
//   node scripts/generate-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ICONS = [
  'house', 'user', 'users', 'users-three', 'package', 'play-circle', 'graduation-cap',
  'chalkboard-teacher', 'shopping-cart', 'warning', 'gear-six', 'magnifying-glass', 'bell',
  'caret-down', 'caret-left', 'caret-right', 'calendar-blank', 'arrow-up', 'arrow-down',
  'arrow-right', 'user-plus', 'check-circle', 'x-circle', 'x', 'storefront', 'eye', 'eye-slash',
  'trash', 'sign-out', 'flag', 'clock', 'envelope', 'phone', 'map-pin', 'arrows-clockwise',
  'check', 'seal-check', 'info', 'truck', 'credit-card', 'image', 'book-open', 'lock-simple',
  'hand-heart', 'medal', 'chart-bar', 'list', 'download-simple', 'megaphone', 'chat-circle-text',
  'circle-dashed', 'handshake', 'pencil-simple', 'plus', 'tag', 'text-align-left', 'pulse', 'link-simple',
  'broadcast', 'star',
];
// Variantes pleines : uniquement celles utilisées avec weight="fill" (barre
// latérale, choix d'audience, pastilles), pour alléger le bundle initial.
const PLEINES = new Set([
  'house', 'user', 'users', 'users-three', 'chat-circle-text', 'circle-dashed', 'handshake', 'package',
  'shopping-cart', 'play-circle', 'medal', 'megaphone', 'warning', 'pulse', 'gear-six', 'flag',
  'check-circle', 'hand-heart', 'chalkboard-teacher',
]);

const entries = [];
for (const name of ICONS) {
  for (const weight of PLEINES.has(name) ? ['regular', 'fill'] : ['regular']) {
    const file = weight === 'regular' ? `${name}.svg` : `${name}-${weight}.svg`;
    const svg = readFileSync(`node_modules/@phosphor-icons/core/assets/${weight}/${file}`, 'utf8');
    const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
    entries.push(`  '${name}${weight === 'fill' ? ':fill' : ''}': '${inner.replace(/'/g, "\\'")}',`);
  }
}

writeFileSync(
  'src/app/shared/icons.ts',
  `// Fichier généré par scripts/generate-icons.mjs — ne pas modifier à la main.
// Icônes Phosphor (MIT), viewBox 0 0 256 256.
export const ICONS: Record<string, string> = {
${entries.join('\n')}
};
`,
);
console.log(`${entries.length} icônes générées`);
