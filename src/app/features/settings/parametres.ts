import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SettingsService } from './settings.service';
import { AuthService } from '../../core/auth/auth.service';
import { dateCourte, dateHeure, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { CategorieAdmin, CleParametre, ParametreAdmin, ReglesVentes, TypeCategorie } from './settings.model';
import { API_ADMIN } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';
import { IconeCategorie } from '../../shared/icons/icone-categorie';
import { ICONES_CATEGORIES } from '../../shared/icons/icones-categories';
import {
  Avatar,
  Badge,
  ConfirmationService,
  EtatVide,
  Squelette,
  EntetePage,
} from '../../shared/components/ui';

const TYPES_CATEGORIE: { type: TypeCategorie; libelle: string; aide: string }[] = [
  {
    type: 'PRODUIT',
    libelle: 'Produits',
    aide: 'Proposées aux artisans lorsqu’ils mettent un produit en vente.',
  },
  {
    type: 'FORMATION',
    libelle: 'Formations',
    aide: 'Proposées aux mentors lorsqu’ils créent une formation.',
  },
  { type: 'PUBLICATION', libelle: 'Publications', aide: 'Thèmes du fil d’actualité.' },
];

/** Catégories d'un type : ajout, renommage, activation, ordre, suppression. */
@Component({
  selector: 'app-categories-parametres',
  imports: [FormsModule, Icon, IconeCategorie, Badge, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories-parametres.html',
})
export class CategoriesParametres {
  private readonly api = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly nombre = nombre;
  protected readonly types = TYPES_CATEGORIE;

  protected readonly type = signal<TypeCategorie>('PRODUIT');
  protected readonly aide = computed(
    () => TYPES_CATEGORIE.find((t) => t.type === this.type())!.aide,
  );
  protected readonly liste = httpResource<CategorieAdmin[]>(() => ({
    url: `${API_ADMIN}/categories`,
    params: { type: this.type() },
  }));
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly enCours = signal(false);
  protected readonly edition = signal<number | null>(null);
  protected readonly choixIcone = signal<number | null>(null);
  protected readonly icones = ICONES_CATEGORIES;
  protected nouvelle = '';
  protected nomEdite = '';

  private executer<T>(
    requete: import('rxjs').Observable<T>,
    succes: string,
    suite: (r: T) => void,
  ): void {
    this.enCours.set(true);
    requete.subscribe({
      next: (r) => {
        this.enCours.set(false);
        suite(r);
        if (succes) this.toast.succes(succes);
      },
      error: (e) => {
        this.enCours.set(false);
        this.toast.erreur(messageApi(e));
      },
    });
  }

  protected ajouter(): void {
    const nom = this.nouvelle.trim();
    if (!nom) return;
    this.executer(
      this.api.enregistrerCategorie(null, { type: this.type(), nom, icone: null, active: true }),
      `« ${nom} » ajoutée.`,
      (c) => {
        this.nouvelle = '';
        this.liste.value.update((l) => [...(l ?? []), c]);
      },
    );
  }

  protected commencerEdition(c: CategorieAdmin): void {
    this.nomEdite = c.nom;
    this.edition.set(c.id);
  }

  protected renommer(c: CategorieAdmin): void {
    const nom = this.nomEdite.trim();
    if (!nom || nom === c.nom) {
      this.edition.set(null);
      return;
    }
    const message = c.utilisations
      ? `Renommée : ${c.utilisations} contenu(s) mis à jour.`
      : 'Catégorie renommée.';
    this.executer(
      this.api.enregistrerCategorie(c.id, { type: c.type, nom, icone: c.icone, active: c.active }),
      message,
      (maj) => {
        this.edition.set(null);
        this.remplacer(maj);
      },
    );
  }

  protected basculer(c: CategorieAdmin): void {
    this.executer(
      this.api.enregistrerCategorie(c.id, {
        type: c.type,
        nom: c.nom,
        icone: c.icone,
        active: !c.active,
      }),
      c.active ? `« ${c.nom} » désactivée.` : `« ${c.nom} » activée.`,
      (maj) => this.remplacer(maj),
    );
  }

  protected choisirIcone(c: CategorieAdmin, icone: string | null): void {
    if (icone === c.icone) {
      this.choixIcone.set(null);
      return;
    }
    this.executer(
      this.api.enregistrerCategorie(c.id, { type: c.type, nom: c.nom, icone, active: c.active }),
      `Icône de « ${c.nom} » mise à jour.`,
      (maj) => {
        this.choixIcone.set(null);
        this.remplacer(maj);
      },
    );
  }

  protected deplacer(index: number, sens: -1 | 1): void {
    const ids = this.liste.value()!.map((c) => c.id);
    [ids[index], ids[index + sens]] = [ids[index + sens], ids[index]];
    this.executer(this.api.reordonnerCategories(this.type(), ids), '', (l) =>
      this.liste.value.set(l),
    );
  }

  protected async supprimer(c: CategorieAdmin): Promise<void> {
    const { ok } = await this.confirmation.demander({
      titre: `Supprimer « ${c.nom} » ?`,
      message: 'Cette catégorie n’est utilisée par aucun contenu.',
      confirmer: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.executer(this.api.supprimerCategorie(c.id), 'Catégorie supprimée.', () =>
      this.liste.value.update((l) => l?.filter((x) => x.id !== c.id)),
    );
  }

  private remplacer(maj: CategorieAdmin): void {
    this.liste.value.update((l) => l?.map((x) => (x.id === maj.id ? maj : x)));
  }
}

/** Coordonnées de contact et textes affichés dans l'application. */
@Component({
  selector: 'app-textes-parametres',
  imports: [FormsModule, Badge, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './textes-parametres.html',
})
export class TextesParametres {
  private readonly api = inject(SettingsService);
  private readonly toast = inject(ToastService);
  protected readonly dateHeure = dateHeure;

  protected readonly parametres = httpResource<ParametreAdmin[]>(() => `${API_ADMIN}/parametres`);
  protected readonly erreur = computed(() => messageApi(this.parametres.error()));
  protected readonly enregistrement = signal(false);
  protected valeurs: Partial<Record<CleParametre, string>> = {};
  protected readonly groupes = computed(() => {
    const liste = this.parametres.hasValue() ? this.parametres.value() : [];
    const courts = liste.filter((p) => p.format !== 'TEXTE_LONG');
    const longs = liste.filter((p) => p.format === 'TEXTE_LONG');
    return [
      { titre: 'Contact et accueil', court: true, parametres: courts },
      { titre: 'Textes de l’application', court: false, parametres: longs },
    ].filter((g) => g.parametres.length);
  });

  constructor() {
    effect(() => {
      if (!this.parametres.hasValue()) return;
      this.valeurs = Object.fromEntries(
        this.parametres.value().map((p) => [p.cle, p.valeur ?? '']),
      );
    });
  }

  protected enregistrer(): void {
    const valeurs = Object.fromEntries(
      Object.entries(this.valeurs).map(([cle, v]) => [cle, v?.trim() || null]),
    );
    this.enregistrement.set(true);
    this.api.enregistrerParametres(valeurs).subscribe({
      next: (liste) => {
        this.enregistrement.set(false);
        this.parametres.value.set(liste);
        this.toast.succes('Paramètres enregistrés.');
      },
      error: (e) => {
        this.enregistrement.set(false);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}

/** Règles des ventes sécurisées : délais et commission, fixés côté serveur. */
@Component({
  selector: 'app-regles-ventes',
  imports: [Icon, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './regles-ventes-parametres.html',
})
export class ReglesVentesParametres {
  protected readonly regles = httpResource<ReglesVentes>(() => `${API_ADMIN}/transactions/regles`);

  protected duree(heures: number): string {
    if (heures >= 24 && heures % 24 === 0)
      return `${heures / 24} jour${heures / 24 > 1 ? 's' : ''}`;
    return `${heures} h`;
  }

  protected commission(pourMille: number): string {
    return pourMille ? `${(pourMille / 10).toLocaleString('fr-FR')} %` : 'Aucune';
  }
}

type Onglet = 'compte' | 'categories' | 'textes' | 'ventes';

@Component({
  selector: 'app-parametres',
  imports: [
    EntetePage,
    RouterLink,
    Icon,
    Avatar,
    Badge,
    CategoriesParametres,
    TextesParametres,
    ReglesVentesParametres,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './parametres.html',
})
export class ParametresPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly dateCourte = dateCourte;
  protected readonly onglets: { cle: Onglet; libelle: string; icone: string }[] = [
    { cle: 'compte', libelle: 'Compte', icone: 'user' },
    { cle: 'categories', libelle: 'Catégories', icone: 'tag' },
    { cle: 'textes', libelle: 'Textes et contacts', icone: 'text-align-left' },
    { cle: 'ventes', libelle: 'Ventes sécurisées', icone: 'lock-simple' },
  ];
  /** Paramètre de requête ?onglet=… */
  readonly onglet = input<string>();
  protected readonly ongletActif = computed<Onglet>(() => {
    const o = this.onglet();
    return o === 'categories' || o === 'textes' || o === 'ventes' ? o : 'compte';
  });
  protected readonly apiUrl = environment.apiUrl;
  protected readonly projetFirebase = environment.firebase.projectId;
  protected readonly etatApi = signal<'attente' | 'ok' | 'ko'>('attente');

  constructor() {
    this.verifier();
  }

  protected verifier(): void {
    this.etatApi.set('attente');
    this.http.get(`${environment.apiUrl}/api/users/me`).subscribe({
      next: () => this.etatApi.set('ok'),
      error: () => this.etatApi.set('ko'),
    });
  }

  protected async deconnexion(): Promise<void> {
    await this.auth.deconnexion();
    await this.router.navigate(['/connexion']);
  }
}
