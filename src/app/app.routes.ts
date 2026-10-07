import type { Routes } from '@angular/router';
import { adminGuard, inviteGuard } from './core/auth/http';
import { Shell } from './core/shell/shell';

export const routes: Routes = [
  {
    path: 'connexion',
    canActivate: [inviteGuard],
    title: 'Connexion · Bolono Admin',
    loadComponent: () => import('./features/auth/connexion').then((m) => m.ConnexionPage),
  },
  {
    path: '',
    component: Shell,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        title: 'Tableau de bord · Bolono Admin',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'utilisateurs',
        title: 'Utilisateurs · Bolono Admin',
        loadComponent: () =>
          import('./features/users/utilisateurs').then((m) => m.UtilisateursPage),
      },
      {
        path: 'boutiques',
        title: 'Boutiques · Bolono Admin',
        loadComponent: () => import('./features/shops/boutiques').then((m) => m.BoutiquesPage),
      },
      {
        path: 'produits',
        title: 'Produits · Bolono Admin',
        loadComponent: () => import('./features/products/produits').then((m) => m.ProduitsPage),
      },
      {
        path: 'formations',
        title: 'Formations · Bolono Admin',
        loadComponent: () => import('./features/courses/formations').then((m) => m.FormationsPage),
      },
      {
        path: 'formations/nouvelle',
        title: 'Nouvelle formation · Bolono Admin',
        loadComponent: () =>
          import('./features/courses/formation-fiche').then((m) => m.FormationFichePage),
      },
      {
        path: 'formations/:id',
        title: 'Formation · Bolono Admin',
        loadComponent: () =>
          import('./features/courses/formation-fiche').then((m) => m.FormationFichePage),
      },
      {
        path: 'mentorat',
        title: 'Mentorat · Bolono Admin',
        loadComponent: () => import('./features/mentorship/mentorat').then((m) => m.MentoratPage),
      },
      {
        path: 'commandes',
        title: 'Commandes · Bolono Admin',
        loadComponent: () => import('./features/orders/commandes').then((m) => m.CommandesPage),
      },
      {
        path: 'paiements',
        title: 'Paiements et litiges · Bolono Admin',
        loadComponent: () => import('./features/payments/paiements').then((m) => m.PaiementsPage),
      },
      {
        path: 'signalements',
        title: 'Signalements · Bolono Admin',
        loadComponent: () =>
          import('./features/reports/signalements').then((m) => m.SignalementsPage),
      },
      {
        path: 'publications',
        title: 'Publications · Bolono Admin',
        loadComponent: () =>
          import('./features/publications/publications').then((m) => m.PublicationsPage),
      },
      {
        path: 'statuts',
        title: 'Statuts · Bolono Admin',
        loadComponent: () => import('./features/statuses/statuts').then((m) => m.StatutsPage),
      },
      {
        path: 'projets',
        title: 'Projets · Bolono Admin',
        loadComponent: () => import('./features/projects/projets').then((m) => m.ProjetsPage),
      },
      {
        path: 'badges',
        title: 'Badges · Bolono Admin',
        loadComponent: () => import('./features/badges/badges').then((m) => m.BadgesPage),
      },
      {
        path: 'annonces',
        title: 'Annonces · Bolono Admin',
        loadComponent: () =>
          import('./features/announcements/annonces').then((m) => m.AnnoncesPage),
      },
      {
        path: 'activite',
        title: 'Activité · Bolono Admin',
        loadComponent: () => import('./features/activity/activite').then((m) => m.ActivitePage),
      },
      {
        path: 'parametres',
        title: 'Paramètres · Bolono Admin',
        loadComponent: () => import('./features/settings/parametres').then((m) => m.ParametresPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
