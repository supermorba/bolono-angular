/** Propose au navigateur d'enregistrer un fichier reçu de l'API (exports CSV). */
export function enregistrerFichier(contenu: Blob, nom: string): void {
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(contenu);
  lien.download = nom;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}

/** Date du jour au format AAAA-MM-JJ (paramètres de période de l'API). */
export function isoJour(date: Date = new Date()): string {
  const decalage = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - decalage).toISOString().slice(0, 10);
}
