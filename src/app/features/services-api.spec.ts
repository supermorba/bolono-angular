import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UsersService } from './users/users.service';
import { ShopsService } from './shops/shops.service';
import { ProductsService } from './products/products.service';
import { MentorshipService } from './mentorship/mentorship.service';
import { PublicationsService } from './publications/publications.service';
import { PaymentsService } from './payments/payments.service';
import { ReportsService } from './reports/reports.service';

describe('Services API par fonctionnalité', () => {
  let users: UsersService;
  let shops: ShopsService;
  let products: ProductsService;
  let mentorship: MentorshipService;
  let publications: PublicationsService;
  let payments: PaymentsService;
  let reports: ReportsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    users = TestBed.inject(UsersService);
    shops = TestBed.inject(ShopsService);
    products = TestBed.inject(ProductsService);
    mentorship = TestBed.inject(MentorshipService);
    publications = TestBed.inject(PublicationsService);
    payments = TestBed.inject(PaymentsService);
    reports = TestBed.inject(ReportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('suspend un compte avec son motif', () => {
    users.definirSuspension(3, true, 'Fraude').subscribe();
    const req = http.expectOne('http://localhost:8080/api/admin/utilisateurs/3/suspension');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ suspendu: true, motif: 'Fraude' });
    req.flush({});
  });

  it("accorde l'accès administrateur et nomme un mentor", () => {
    users.definirAccesAdmin(3, true).subscribe();
    const admin = http.expectOne('http://localhost:8080/api/admin/utilisateurs/3/admin');
    expect(admin.request.body).toEqual({ admin: true });
    admin.flush({});

    users.definirMentor(3, false).subscribe();
    const mentor = http.expectOne('http://localhost:8080/api/admin/utilisateurs/3/mentor');
    expect(mentor.request.body).toEqual({ mentor: false });
    mentor.flush({});
  });

  it('exporte en CSV sans les filtres vides', () => {
    users.exporterUtilisateurs({ q: '', role: 'MENTOR', statut: '' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/admin/utilisateurs/export'));
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.keys()).toEqual(['role']);
    req.flush(new Blob(['a;b']));
  });

  it('masque une boutique avec un motif', () => {
    shops.changerVisibiliteBoutique(3, false, 'Contrefaçons').subscribe();
    const req = http.expectOne('http://localhost:8080/api/admin/boutiques/3/visibilite');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ visible: false, motif: 'Contrefaçons' });
    req.flush({});
  });

  it('masque un produit', () => {
    products.changerVisibiliteProduit(4, false).subscribe();
    const req = http.expectOne('http://localhost:8080/api/admin/produits/4/visibilite');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ visible: false });
    req.flush({});
  });

  it('transmet le motif de refus d’une candidature', () => {
    mentorship.deciderCandidature(9, 'REFUSE', 'Dossier incomplet').subscribe();
    const req = http.expectOne(
      'http://localhost:8080/api/users/admin/candidatures-mentor/9/decision',
    );
    expect(req.request.body).toEqual({ statut: 'REFUSE', motifRefus: 'Dossier incomplet' });
    req.flush({});
  });

  it("prévient l'utilisateur par défaut, sans paramètre superflu", () => {
    publications.supprimerPublication(5).subscribe();
    const parDefaut = http.expectOne((r) => r.url.endsWith('/api/admin/publications/5'));
    expect(parDefaut.request.params.keys()).toEqual([]);
    parDefaut.flush(null);

    publications
      .supprimerPublication(5, { notifier: true, motif: 'Contenu hors sujet' })
      .subscribe();
    const avecMotif = http.expectOne((r) => r.url.endsWith('/api/admin/publications/5'));
    expect(avecMotif.request.params.get('motif')).toBe('Contenu hors sujet');
    expect(avecMotif.request.params.has('notifier')).toBe(false);
    avecMotif.flush(null);
  });

  it("n'envoie ni notification ni motif quand l'option est décochée", () => {
    publications.supprimerPublication(8, { notifier: false, motif: 'ignoré' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/admin/publications/8'));
    expect(req.request.params.get('notifier')).toBe('false');
    expect(req.request.params.has('motif')).toBe(false);
    req.flush(null);
  });

  it('confirme un paiement avec le montant reçu et la référence de l’opération', () => {
    payments.confirmerPaiement('PS-ABCD2345', 25000, 'OM-1').subscribe();
    const req = http.expectOne('http://localhost:8080/api/admin/paiements/PS-ABCD2345/confirmer');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ montantRecu: 25000, referenceOperation: 'OM-1' });
    req.flush(null);
  });

  it('modère une publication signalée', () => {
    reports.moderer(12, 'MASQUEE').subscribe();
    const req = http.expectOne('http://localhost:8080/api/admin/signalements/12');
    expect(req.request.body).toEqual({ statut: 'MASQUEE' });
    req.flush({});
  });
});
