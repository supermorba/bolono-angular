import type { Routes } from '@angular/router';
import { adminGuard, inviteGuard } from './core/http';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'connexion',
    canActivate: [inviteGuard],
    title: 'Connexion · Bolono Admin',
    loadComponent: () => import('./pages/connexion').then((m) => m.ConnexionPage),
  },
  {
    path: '',
    component: Shell,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        title: 'Tableau de bord · Bolono Admin',
        loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'utilisateurs',
        title: 'Utilisateurs · Bolono Admin',
        loadComponent: () => import('./pages/utilisateurs').then((m) => m.UtilisateursPage),
      },
      {
        path: 'boutiques',
        title: 'Boutiques · Bolono Admin',
        loadComponent: () => import('./pages/boutiques').then((m) => m.BoutiquesPage),
      },
      {
        path: 'produits',
        title: 'Produits · Bolono Admin',
        loadComponent: () => import('./pages/produits').then((m) => m.ProduitsPage),
      },
      {
        path: 'formations',
        title: 'Formations · Bolono Admin',
        loadComponent: () => import('./pages/formations').then((m) => m.FormationsPage),
      },
      {
        path: 'formations/nouvelle',
        title: 'Nouvelle formation · Bolono Admin',
        loadComponent: () => import('./pages/formation-fiche').then((m) => m.FormationFichePage),
      },
      {
        path: 'formations/:id',
        title: 'Formation · Bolono Admin',
        loadComponent: () => import('./pages/formation-fiche').then((m) => m.FormationFichePage),
      },
      {
        path: 'mentorat',
        title: 'Mentorat · Bolono Admin',
        loadComponent: () => import('./pages/mentorat').then((m) => m.MentoratPage),
      },
      {
        path: 'commandes',
        title: 'Commandes · Bolono Admin',
        loadComponent: () => import('./pages/commandes').then((m) => m.CommandesPage),
      },
      {
        path: 'paiements',
        title: 'Paiements et litiges · Bolono Admin',
        loadComponent: () => import('./pages/paiements').then((m) => m.PaiementsPage),
      },
      {
        path: 'signalements',
        title: 'Signalements · Bolono Admin',
        loadComponent: () => import('./pages/signalements').then((m) => m.SignalementsPage),
      },
      {
        path: 'publications',
        title: 'Publications · Bolono Admin',
        loadComponent: () => import('./pages/publications').then((m) => m.PublicationsPage),
      },
      {
        path: 'statuts',
        title: 'Statuts · Bolono Admin',
        loadComponent: () => import('./pages/statuts').then((m) => m.StatutsPage),
      },
      {
        path: 'projets',
        title: 'Projets · Bolono Admin',
        loadComponent: () => import('./pages/projets').then((m) => m.ProjetsPage),
      },
      {
        path: 'badges',
        title: 'Badges · Bolono Admin',
        loadComponent: () => import('./pages/badges').then((m) => m.BadgesPage),
      },
      {
        path: 'annonces',
        title: 'Annonces · Bolono Admin',
        loadComponent: () => import('./pages/annonces').then((m) => m.AnnoncesPage),
      },
      {
        path: 'activite',
        title: 'Activité · Bolono Admin',
        loadComponent: () => import('./pages/activite').then((m) => m.ActivitePage),
      },
      {
        path: 'parametres',
        title: 'Paramètres · Bolono Admin',
        loadComponent: () => import('./pages/parametres').then((m) => m.ParametresPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
