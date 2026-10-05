import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { type Type } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivitePage } from './activite';
import { BoutiquesPage } from './boutiques';
import { CommandesPage } from './commandes';
import { FormationsPage } from './formations';
import { MentoratPage } from './mentorat';
import { PaiementsPage } from './paiements';
import { ProduitsPage } from './produits';
import { ProjetsPage } from './projets';
import { PublicationsPage } from './publications';
import { StatutsPage } from './statuts';
import { UtilisateursPage } from './utilisateurs';

/**
 * Recherches et filtres des pages de liste : chaque action de l'utilisateur
 * (onglet, liste déroulante, saisie, dates) doit relancer la requête avec le
 * bon paramètre.
 */

const PAGE_VIDE = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 12, first: true, last: true };

/** Réponse vide adaptée à l'adresse appelée. */
function reponseVide(url: string): object {
  if (url.includes('/compteurs')) return {};
  if (url.includes('/categories')) return [{ id: 1, nom: 'Création', type: 'PUBLICATION', icone: null, ordre: 0 }];
  if (url.includes('/activites')) return { contenu: [], page: 0, suite: false };
  if (/\/transactions(\/|$)|\/paiements\/|\/formations$/.test(url)) return [];
  if (url.endsWith('/admin/utilisateurs')) {
    return {
      ...PAGE_VIDE,
      totalElements: 1,
      totalPages: 1,
      content: [
        {
          id: 1, nom: 'Awa Diarra', email: 'awa@bolono.ml', telephone: null, photoUrl: null, role: 'MEMBRE',
          mentor: false, specialite: null, ville: null, dateInscription: '2026-01-01T10:00:00', suspendu: false,
          boutiqueId: null,
        },
      ],
    };
  }
  return PAGE_VIDE;
}

let http: HttpTestingController;

/** Lance les effets (requêtes des ressources) sans attendre leur réponse. */
function declencher(f: ComponentFixture<unknown>): void {
  f.detectChanges();
  TestBed.tick();
}

/** Répond à toutes les requêtes en attente ; renvoie celles vers [chemin]. */
async function repondre(f: ComponentFixture<unknown>, chemin: string): Promise<TestRequest[]> {
  const recues: TestRequest[] = [];
  // Deux passes : une réponse peut en déclencher une autre (compteurs…).
  for (let passe = 0; passe < 2; passe++) {
    declencher(f);
    const toutes = http.match(() => true);
    for (const r of toutes) r.flush(reponseVide(r.request.url));
    recues.push(...toutes);
    await f.whenStable();
  }
  declencher(f);
  return recues.filter((r) => r.request.url.split('?')[0].endsWith(chemin));
}

/** Dernière requête vers [chemin] après l'action. */
async function derniere(f: ComponentFixture<unknown>, chemin: string): Promise<TestRequest> {
  let requetes: TestRequest[] = [];
  for (let essai = 0; essai < 3 && !requetes.length; essai++) {
    requetes = await repondre(f, chemin);
  }
  expect(requetes.length, `aucune requête vers ${chemin}`).toBeGreaterThan(0);
  return requetes[requetes.length - 1];
}

async function monter<T>(type: Type<T>, chemin: string): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(type);
  await repondre(f as ComponentFixture<unknown>, chemin);
  return f;
}

function cliquer(f: ComponentFixture<unknown>, texte: string): void {
  const el = f.nativeElement as HTMLElement;
  // Texte exact d'abord (« Litige » ≠ onglet « Litiges »), sinon début du texte
  // (bouton suivi d'un compteur).
  const boutons = [...el.querySelectorAll('button')];
  const bouton =
    boutons.find((b) => b.textContent?.trim() === texte) ??
    boutons.find((b) => b.textContent?.trim().startsWith(texte));
  expect(bouton, `bouton « ${texte} » introuvable`).toBeTruthy();
  bouton!.click();
}

async function saisir(f: ComponentFixture<unknown>, texte: string, selecteur = 'input[type="search"]'): Promise<void> {
  const champ = (f.nativeElement as HTMLElement).querySelector<HTMLInputElement>(selecteur);
  expect(champ, `champ ${selecteur} introuvable`).toBeTruthy();
  champ!.value = texte;
  champ!.dispatchEvent(new Event('input'));
  // Recherche temporisée de 300 ms.
  await new Promise((r) => setTimeout(r, 350));
}

function choisir(f: ComponentFixture<unknown>, selecteur: string, valeur: string, evenement = 'change'): void {
  const champ = (f.nativeElement as HTMLElement).querySelector<HTMLSelectElement | HTMLInputElement>(selecteur);
  expect(champ, `champ ${selecteur} introuvable`).toBeTruthy();
  champ!.value = valeur;
  champ!.dispatchEvent(new Event(evenement));
}

/** Paramètre de la requête, qu'il soit passé en options ou déjà dans l'adresse. */
const param = (r: TestRequest, nom: string) =>
  r.request.params.get(nom) ?? new URL(r.request.urlWithParams).searchParams.get(nom);

afterEach(() => {
  try {
    http?.verify();
  } finally {
    TestBed.resetTestingModule();
  }
});

describe('Filtres et recherches du back-office', () => {
  it('Commandes : statut, recherche, dates, puis « Effacer les filtres »', async () => {
    const f = await monter(CommandesPage, '/admin/commandes');
    cliquer(f, 'Payées');
    expect(param(await derniere(f, '/admin/commandes'), 'statut')).toBe('PAYEE');
    await saisir(f, 'BOL-0042');
    expect(param(await derniere(f, '/admin/commandes'), 'q')).toBe('BOL-0042');
    choisir(f, 'input[type="date"]', '2026-01-01');
    const r = await derniere(f, '/admin/commandes');
    expect(param(r, 'du')).toBe('2026-01-01');
    expect(param(r, 'statut')).toBe('PAYEE');
    cliquer(f, 'Effacer les filtres');
    const vide = await derniere(f, '/admin/commandes');
    expect([param(vide, 'statut'), param(vide, 'q'), param(vide, 'du')]).toEqual([null, null, null]);
  });

  it('Produits : statut et recherche', async () => {
    const f = await monter(ProduitsPage, '/admin/produits');
    cliquer(f, 'Masqués');
    expect(param(await derniere(f, '/admin/produits'), 'statut')).toBe('MASQUE');
    await saisir(f, 'pagne');
    expect(param(await derniere(f, '/admin/produits'), 'q')).toBe('pagne');
  });

  it('Utilisateurs : profil, recherche et tri', async () => {
    const f = await monter(UtilisateursPage, '/admin/utilisateurs');
    cliquer(f, 'Mentors');
    expect(param(await derniere(f, '/admin/utilisateurs'), 'role')).toBe('MENTOR');
    await saisir(f, 'awa');
    expect(param(await derniere(f, '/admin/utilisateurs'), 'q')).toBe('awa');
    cliquer(f, 'Utilisateur');
    expect(param(await derniere(f, '/admin/utilisateurs'), 'sort')).toBe('nom,asc');
  });

  it('Publications : statut, catégorie et recherche', async () => {
    const f = await monter(PublicationsPage, '/admin/publications');
    cliquer(f, 'Signalées');
    expect(param(await derniere(f, '/admin/publications'), 'statut')).toBe('SIGNALEE');
    choisir(f, 'select[aria-label="Catégorie"]', 'Création');
    expect(param(await derniere(f, '/admin/publications'), 'categorie')).toBe('Création');
    await saisir(f, 'tissage');
    expect(param(await derniere(f, '/admin/publications'), 'q')).toBe('tissage');
  });

  it('Projets : statut et recherche', async () => {
    const f = await monter(ProjetsPage, '/admin/projets');
    cliquer(f, 'Terminé');
    expect(param(await derniere(f, '/admin/projets'), 'statut')).toBe('TERMINE');
    await saisir(f, 'ségou');
    expect(param(await derniere(f, '/admin/projets'), 'q')).toBe('ségou');
  });

  it('Boutiques : statut et recherche', async () => {
    const f = await monter(BoutiquesPage, '/admin/boutiques');
    cliquer(f, 'Masquées');
    expect(param(await derniere(f, '/admin/boutiques'), 'statut')).toBe('MASQUEE');
    await saisir(f, 'awa');
    expect(param(await derniere(f, '/admin/boutiques'), 'q')).toBe('awa');
  });

  it('Mentorat : statut des candidatures', async () => {
    const f = await monter(MentoratPage, '/admin/candidatures-mentor');
    cliquer(f, 'Refusées');
    expect(param(await derniere(f, '/admin/candidatures-mentor'), 'statut')).toBe('REFUSE');
  });

  it('Activité : type', async () => {
    const f = await monter(ActivitePage, '/admin/activites');
    cliquer(f, 'Commandes');
    expect(param(await derniere(f, '/admin/activites'), 'type')).toBe('COMMANDE');
  });

  it('Statuts : actifs ou historique complet', async () => {
    const f = await monter(StatutsPage, '/admin/statuts');
    cliquer(f, 'Historique');
    expect(param(await derniere(f, '/admin/statuts'), 'actifs')).toBe('false');
  });

  it('Paiements : toutes les transactions, filtrées par statut', async () => {
    const f = await monter(PaiementsPage, '/admin/paiements/en-attente');
    cliquer(f, 'Toutes les transactions');
    await derniere(f, '/admin/transactions');
    cliquer(f, 'Litige');
    expect(param(await derniere(f, '/admin/transactions'), 'statut')).toBe('EN_LITIGE');
  });

  it('Formations : recherche', async () => {
    const f = await monter(FormationsPage, '/admin/formations');
    await saisir(f, 'teinture');
    expect(param(await derniere(f, '/admin/formations'), 'q')).toBe('teinture');
  });
});
