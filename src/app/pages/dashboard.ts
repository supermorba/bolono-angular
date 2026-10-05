import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LIBELLES_COMMANDE, compact, dateHeure, eur, fcfa, ilYa, mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import { AdminApi } from '../core/admin-api.service';
import { enregistrerFichier, isoJour } from '../core/telechargement';
import { ToastService } from '../core/toast.service';
import type { Dashboard, StatutCommande, SyntheseVentes, VentesPeriode } from '../core/models';
import { API_ADMIN, derniereValeur, rechargerEnDirect } from '../core/ressources';
import { FormsModule } from '@angular/forms';
import { Anneau, Courbes, Histogramme, type Part } from '../shared/charts';
import { STYLE_ACTIVITE, cheminLien, parametresLien } from '../shared/activite';
import { Icon } from '../shared/icon';
import { Badge, BarreChargement, ChiffresCles, EntetePage, EtatVide, Evolution, Squelette, type ChiffreCle, type Ton } from '../shared/ui';

export const TON_COMMANDE: Record<StatutCommande, Ton> = {
  EN_ATTENTE: 'attention',
  PAYEE: 'info',
  EXPEDIEE: 'accent',
  LIVREE: 'succes',
  ANNULEE: 'erreur',
};


@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink, Icon, Badge, BarreChargement, ChiffresCles, EntetePage, Evolution, Squelette, EtatVide, Courbes, Anneau, Histogramme],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
})
export class DashboardPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);

  protected readonly fcfa = fcfa;
  protected readonly nombre = nombre;
  protected readonly ilYa = ilYa;
  protected readonly dateHeure = dateHeure;
  protected readonly mediaUrl = mediaUrl;
  protected readonly libellesCommande = LIBELLES_COMMANDE;
  protected readonly tonCommande = TON_COMMANDE;
  protected readonly styleActivite = STYLE_ACTIVITE;
  protected readonly cheminLien = cheminLien;
  protected readonly parametresLien = parametresLien;

  /** Période du graphique des inscriptions : la changer relance la ressource. */
  protected readonly jours = signal(30);
  protected readonly tableau = httpResource<Dashboard>(() => ({
    url: `${API_ADMIN}/dashboard`,
    params: { jours: this.jours() },
  }));
  /** Données affichées : les précédentes restent visibles pendant un rechargement. */
  protected readonly donnees = derniereValeur(this.tableau);
  protected readonly enChargement = computed(() => this.tableau.isLoading() && !!this.donnees());
  /** Erreur bloquante uniquement s'il n'y a encore rien à afficher. */
  protected readonly erreur = computed(() =>
    this.tableau.error() && !this.donnees() ? messageApi(this.tableau.error(), 'Impossible de charger le tableau de bord.') : null,
  );
  protected readonly devise = signal<'FCFA' | 'EUR'>('FCFA');
  /** Argent en séquestre et tâches de l'équipe (ventes sécurisées). */
  protected readonly synthese = httpResource<SyntheseVentes>(() => `${API_ADMIN}/transactions/synthese`);

  protected readonly aujourdhui = (() => {
    const texte = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  })();

  protected readonly kpis = computed<ChiffreCle[]>(() => {
    const k = this.donnees()?.kpis;
    return [
      { libelle: 'Utilisateurs inscrits', ind: k?.utilisateurs },
      { libelle: 'Produits en ligne', ind: k?.produitsEnLigne },
      { libelle: 'Formations publiées', ind: k?.formations },
      { libelle: 'Commandes ce mois', ind: k?.commandesMois },
    ].map(({ libelle, ind }) => ({ libelle, valeur: ind ? nombre(ind.valeur) : null, evolution: ind?.evolution ?? null }));
  });

  protected readonly inscriptions = computed(() => {
    const d = this.donnees();
    if (!d) return null;
    return {
      etiquettes: d.inscriptions.map((p) => new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })),
      series: [
        { nom: 'Artisans', couleur: 'var(--color-chart-artisan)', valeurs: d.inscriptions.map((p) => p.artisans) },
        { nom: 'Acheteurs', couleur: 'var(--color-chart-vert)', valeurs: d.inscriptions.map((p) => p.acheteurs) },
      ],
    };
  });

  protected readonly repartition = computed<Part[]>(() => {
    const r = this.donnees()?.repartition;
    if (!r) return [];
    return [
      { nom: 'Artisans', valeur: r.artisans, couleur: 'var(--color-chart-artisan)' },
      { nom: 'Acheteurs', valeur: r.acheteurs, couleur: 'var(--color-chart-acheteur)' },
      { nom: 'Mentors', valeur: r.mentors, couleur: 'var(--color-chart-mentor)' },
      { nom: 'Administrateurs', valeur: r.administrateurs, couleur: 'var(--color-sand-deep)' },
    ];
  });

  // ── Ventes sur une période choisie ─────────────────────────────────────
  protected readonly periodes = [
    { cle: 'mois', libelle: 'Ce mois' },
    { cle: '7', libelle: '7 j' },
    { cle: '30', libelle: '30 j' },
    { cle: '90', libelle: '90 j' },
    { cle: 'perso', libelle: 'Période…' },
  ] as const;
  protected readonly periode = signal<'mois' | '7' | '30' | '90' | 'perso'>('mois');
  protected readonly aujourdhuiIso = isoJour();
  protected readonly du = signal(isoJour(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  protected readonly au = signal(isoJour());
  /** Bornes effectives de la période sélectionnée. */
  protected readonly bornes = computed(() => {
    const p = this.periode();
    if (p === 'perso') return this.du() && this.au() && this.du() <= this.au() ? { du: this.du(), au: this.au() } : null;
    const fin = new Date();
    const debut = p === 'mois' ? new Date(fin.getFullYear(), fin.getMonth(), 1) : new Date(fin.getTime() - (Number(p) - 1) * 86_400_000);
    return { du: isoJour(debut), au: isoJour(fin) };
  });
  protected readonly ventesPeriode = httpResource<VentesPeriode>(() => {
    const b = this.bornes();
    return b ? { url: `${API_ADMIN}/ventes`, params: b } : undefined;
  });
  protected readonly ventesAffichees = derniereValeur(this.ventesPeriode);
  protected readonly libellePeriode = computed(() => {
    const p = this.periode();
    return p === 'mois' ? 'vs mois dernier' : 'vs période précédente';
  });
  protected readonly exportEnCours = signal(false);
  protected readonly erreurVentes = computed(() => messageApi(this.ventesPeriode.error()));

  protected readonly ventes = computed(() => {
    const v = this.ventesAffichees();
    if (!v) return null;
    const enEuro = this.devise() === 'EUR';
    const convertir = (montant: number) => (enEuro ? montant / v.tauxEur : montant);
    return {
      total: enEuro ? eur(convertir(v.total)) : fcfa(v.total),
      commandes: v.commandes,
      panierMoyen: enEuro ? eur(convertir(v.panierMoyen)) : fcfa(v.panierMoyen),
      evolution: v.evolution,
      etiquettes: v.parJour.map((p) => new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })),
      valeurs: v.parJour.map((p) => convertir(p.montant)),
      formatInfobulle: (m: number) => (enEuro ? eur(m) : fcfa(m)),
    };
  });

  protected readonly formatAxe = compact;

  protected readonly actionsRapides = [
    { libelle: 'Produits', icone: 'package', lien: '/produits', params: {} },
    { libelle: 'Candidatures', icone: 'seal-check', lien: '/mentorat', params: {} },
    { libelle: 'Utilisateurs', icone: 'user-plus', lien: '/utilisateurs', params: {} },
    { libelle: 'Formations', icone: 'play-circle', lien: '/formations', params: {} },
    { libelle: 'Commandes', icone: 'shopping-cart', lien: '/commandes', params: {} },
    { libelle: 'Signalements', icone: 'warning', lien: '/signalements', params: {} },
  ];

  constructor() {
    rechargerEnDirect(this.synthese);
  }

  protected exporterRapport(): void {
    const b = this.bornes();
    if (!b) {
      this.toast.erreur('Choisissez une période valide.');
      return;
    }
    this.exportEnCours.set(true);
    this.api.exporterRapport(b.du, b.au).subscribe({
      next: (blob) => {
        this.exportEnCours.set(false);
        enregistrerFichier(blob, `rapport-bolono-${b.du}-au-${b.au}.csv`);
      },
      error: (e) => {
        this.exportEnCours.set(false);
        this.toast.erreur(messageApi(e, "L'export du rapport a échoué."));
      },
    });
  }

  protected changerPeriode(jours: number): void {
    this.jours.set(jours);
  }

  protected charger(): void {
    this.tableau.reload();
  }

  protected pourcentage(valeur: number): string {
    const total = this.donnees()?.repartition.total ?? 0;
    return total ? `${Math.round((valeur / total) * 100)}%` : '0%';
  }
}
