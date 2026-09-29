# Bolono — back-office d'administration

Application Angular 22 (composants autonomes, signaux, Tailwind 4) pour administrer la plateforme Bolono. Elle reprend le thème de l'application mobile : couleurs de `BolonoColors`, police Noto Sans et icônes Phosphor.

## Démarrage

```bash
npm install
npm start          # http://localhost:4200
npm test           # tests unitaires (Vitest)
npm run build      # build de production dans dist/
```

Le backend Spring Boot doit tourner sur l'adresse indiquée par `apiUrl`, dans `src/environments/environment.ts` (par défaut `http://localhost:8080`).

## Connexion

L'authentification passe par Firebase, avec le même projet que l'app mobile (`bolono-2026`), par e-mail et mot de passe. Le backend vérifie ensuite le rôle de l'utilisateur : seuls les comptes au rôle `ADMIN` peuvent ouvrir le back-office.

1. Dans la console Firebase, enregistrez une application **Web** : Paramètres du projet → Vos applications → Ajouter une application.
2. Reportez son `apiKey` et son `appId` dans `src/environments/environment.ts`. La clé actuellement présente est celle de l'app Android : si elle est restreinte à Android, Firebase refusera les connexions depuis un navigateur.
3. Vérifiez que le fournisseur « E-mail/Mot de passe » est activé : Authentication → Méthode de connexion.
4. Donnez le rôle `ADMIN` au compte concerné, en base ou via `PATCH /api/users/{id}/role` depuis un compte déjà administrateur.

## Contenu

| Page | Données (API) |
| --- | --- |
| Tableau de bord | `GET /api/admin/dashboard` : indicateurs, inscriptions, répartition, ventes, classements, activité |
| Utilisateurs | `GET /api/admin/utilisateurs`, `DELETE /api/admin/utilisateurs/{id}` |
| Produits | `GET /api/admin/produits`, `PATCH /api/admin/produits/{id}/validation` |
| Formations | `GET /api/admin/formations`, `DELETE /api/admin/formations/{id}` |
| Mentorat | `GET /api/users/admin/candidatures-mentor`, `POST …/{id}/decision` |
| Commandes | `GET /api/admin/commandes`, `PATCH /api/admin/commandes/{id}/statut` |
| Signalements | `GET /api/admin/signalements`, `PATCH /api/admin/signalements/{id}` |
| Barre du haut | `GET /api/admin/recherche` (recherche globale), `GET /api/admin/notifications` (cloche) |

## Organisation

```
src/app/
  core/     session (Firebase), intercepteur et gardes, client d'API typé, formats, toasts
  shared/   icônes, composants d'interface, graphiques SVG (courbes, anneau, histogramme)
  layout/   cadre : barre latérale, recherche, notifications, menu du compte
  pages/    une page par section
```

Les icônes sont générées depuis `@phosphor-icons/core`. Pour en ajouter une, complétez la liste dans `scripts/generate-icons.mjs`, puis lancez `node scripts/generate-icons.mjs`.
