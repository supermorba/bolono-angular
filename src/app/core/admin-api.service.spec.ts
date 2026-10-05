import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminApi } from './admin-api.service';
import { sansVides } from './ressources';

describe('AdminApi', () => {
  let api: AdminApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AdminApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('suspend un compte avec son motif', () => {
    api.definirSuspension(3, true, 'Fraude').subscribe();
    const req = http.expectOne('http://localhost:8080/api/admin/utilisateurs/3/suspension');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ suspendu: true, motif: 'Fraude' });
    req.flush({});
  });

  it("accorde l'accès administrateur et nomme un mentor", () => {
    api.definirAccesAdmin(3, true).subscribe();
    const admin = http.expectOne('http://localhost:8080/api/admin/utilisateurs/3/admin');
    expect(admin.request.body).toEqual({ admin: true });
    admin.flush({});

    api.definirMentor(3, false).subscribe();
    const mentor = http.expectOne('http://localhost:8080/api/admin/utilisateurs/3/mentor');
    expect(mentor.request.body).toEqual({ mentor: false });
    mentor.flush({});
  });

  it("exporte en CSV sans les filtres vides", () => {
    api.exporterUtilisateurs({ q: '', role: 'MENTOR', statut: '' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/admin/utilisateurs/export'));
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.keys()).toEqual(['role']);
    req.flush(new Blob(['a;b']));
  });

  it('masque une boutique avec un motif', () => {
    api.changerVisibiliteBoutique(3, false, 'Contrefaçons').subscribe();
    const req = http.expectOne('http://localhost:8080/api/admin/boutiques/3/visibilite');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ visible: false, motif: 'Contrefaçons' });
    req.flush({});
  });

  it('masque un produit', () => {
    api.changerVisibiliteProduit(4, false).subscribe();
    const req = http.expectOne('http://localhost:8080/api/admin/produits/4/visibilite');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ visible: false });
    req.flush({});
  });

  it('transmet le motif de refus d’une candidature', () => {
    api.deciderCandidature(9, 'REFUSE', 'Dossier incomplet').subscribe();
    const req = http.expectOne('http://localhost:8080/api/users/admin/candidatures-mentor/9/decision');
    expect(req.request.body).toEqual({ statut: 'REFUSE', motifRefus: 'Dossier incomplet' });
    req.flush({});
  });

  it("prévient l'utilisateur par défaut, sans paramètre superflu", () => {
    api.supprimerPublication(5).subscribe();
    const parDefaut = http.expectOne((r) => r.url.endsWith('/api/admin/publications/5'));
    expect(parDefaut.request.params.keys()).toEqual([]);
    parDefaut.flush(null);

    api.supprimerPublication(5, { notifier: true, motif: 'Contenu hors sujet' }).subscribe();
    const avecMotif = http.expectOne((r) => r.url.endsWith('/api/admin/publications/5'));
    expect(avecMotif.request.params.get('motif')).toBe('Contenu hors sujet');
    expect(avecMotif.request.params.has('notifier')).toBe(false);
    avecMotif.flush(null);
  });

  it("n'envoie ni notification ni motif quand l'option est décochée", () => {
    api.supprimerPublication(8, { notifier: false, motif: 'ignoré' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/admin/publications/8'));
    expect(req.request.params.get('notifier')).toBe('false');
    expect(req.request.params.has('motif')).toBe(false);
    req.flush(null);
  });

  it('confirme un paiement avec le montant reçu et la référence de l’opération', () => {
    api.confirmerPaiement('PS-ABCD2345', 25000, 'OM-1').subscribe();
    const req = http.expectOne('http://localhost:8080/api/admin/paiements/PS-ABCD2345/confirmer');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ montantRecu: 25000, referenceOperation: 'OM-1' });
    req.flush(null);
  });

  it('modère une publication signalée', () => {
    api.moderer(12, 'MASQUEE').subscribe();
    const req = http.expectOne('http://localhost:8080/api/admin/signalements/12');
    expect(req.request.body).toEqual({ statut: 'MASQUEE' });
    req.flush({});
  });
});

describe('sansVides', () => {
  it('retire les paramètres vides mais garde zéro', () => {
    expect(sansVides({ q: '', role: 'ARTISAN', statut: null, page: 0, x: undefined })).toEqual({ role: 'ARTISAN', page: 0 });
  });
});
