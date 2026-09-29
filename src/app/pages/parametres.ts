import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { AdminApi } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';
import { dateCourte, dateHeure, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { CategorieAdmin, CleParametre, ParametreAdmin, TypeCategorie } from '../core/models';
import { API_ADMIN } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Avatar, Badge, ConfirmationService, EtatVide, Squelette } from '../shared/ui';

const TYPES_CATEGORIE: { type: TypeCategorie; libelle: string; aide: string }[] = [
  { type: 'PRODUIT', libelle: 'Produits', aide: 'Proposées aux artisans lorsqu’ils mettent un produit en vente.' },
  { type: 'FORMATION', libelle: 'Formations', aide: 'Proposées aux mentors lorsqu’ils créent une formation.' },
  { type: 'PUBLICATION', libelle: 'Publications', aide: 'Thèmes du fil d’actualité.' },
];

/** Catégories d'un type : ajout, renommage, activation, ordre, suppression. */
@Component({
  selector: 'app-categories-parametres',
  imports: [FormsModule, Icon, Badge, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-card p-1 sm:w-fit">
      @for (t of types; track t.type) {
        <button class="onglet" [class.onglet-actif]="type() === t.type" (click)="type.set(t.type)">{{ t.libelle }}</button>
      }
    </div>
    <p class="mb-4 text-sm text-muted-strong">{{ aide() }} Une catégorie désactivée n'est plus proposée mais reste affichée sur les contenus existants.</p>

    <form class="mb-4 flex gap-2" (submit)="$event.preventDefault(); ajouter()">
      <input class="input" name="nouvelle" [(ngModel)]="nouvelle" maxlength="60" placeholder="Nouvelle catégorie" />
      <button class="btn-accent shrink-0" type="submit" [disabled]="!nouvelle.trim() || enCours()"><app-icon name="plus" [size]="17" /> Ajouter</button>
    </form>

    @if (liste.error() && !liste.hasValue()) {
      <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
        <button class="btn-accent btn-sm mt-2" (click)="liste.reload()">Réessayer</button>
      </app-etat-vide>
    } @else if (liste.hasValue()) {
      <ul class="divide-y divide-line rounded-xl border border-line transition-opacity" [class.opacity-60]="liste.isLoading() || enCours()">
        @for (c of liste.value(); track c.id; let i = $index, premier = $first, dernier = $last) {
          <li class="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap">
            <div class="flex flex-col">
              <button class="rounded p-0.5 text-muted hover:text-brown disabled:opacity-25" [disabled]="premier || enCours()" (click)="deplacer(i, -1)" aria-label="Monter"><app-icon name="arrow-up" [size]="13" /></button>
              <button class="rounded p-0.5 text-muted hover:text-brown disabled:opacity-25" [disabled]="dernier || enCours()" (click)="deplacer(i, 1)" aria-label="Descendre"><app-icon name="arrow-down" [size]="13" /></button>
            </div>
            @if (edition() === c.id) {
              <form class="flex min-w-0 flex-1 gap-2" (submit)="$event.preventDefault(); renommer(c)">
                <input class="input py-1.5!" name="nom" [(ngModel)]="nomEdite" maxlength="60" autofocus />
                <button class="btn-accent btn-sm" type="submit">OK</button>
                <button class="btn-outline btn-sm" type="button" (click)="edition.set(null)">Annuler</button>
              </form>
            } @else {
              <span class="min-w-0 flex-1">
                <span class="font-semibold" [class.text-muted]="!c.active">{{ c.nom }}</span>
                <span class="ml-2 text-xs text-muted">{{ nombre(c.utilisations) }} contenu{{ c.utilisations > 1 ? 's' : '' }}</span>
              </span>
              @if (!c.active) {
                <app-badge>Désactivée</app-badge>
              }
              <label class="flex items-center gap-1.5 text-xs text-muted-strong" [title]="c.active ? 'Désactiver' : 'Activer'">
                <input type="checkbox" class="h-4 w-4 accent-terracotta" [checked]="c.active" [disabled]="enCours()" (change)="basculer(c)" />
                Active
              </label>
              <button class="rounded-lg p-1.5 text-muted hover:bg-card hover:text-brown" (click)="commencerEdition(c)" aria-label="Renommer"><app-icon name="pencil-simple" [size]="16" /></button>
              <button
                class="rounded-lg p-1.5 text-muted hover:bg-error-surface hover:text-error disabled:opacity-30"
                [disabled]="c.utilisations > 0 || enCours()"
                [title]="c.utilisations > 0 ? 'Utilisée : désactivez-la plutôt' : 'Supprimer'"
                (click)="supprimer(c)"
                aria-label="Supprimer"
              >
                <app-icon name="trash" [size]="16" />
              </button>
            }
          </li>
        } @empty {
          <li class="px-3 py-6 text-center text-sm text-muted">Aucune catégorie.</li>
        }
      </ul>
    } @else {
      <app-squelette [hauteur]="220" />
    }
  `,
})
export class CategoriesParametres {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly nombre = nombre;
  protected readonly types = TYPES_CATEGORIE;

  protected readonly type = signal<TypeCategorie>('PRODUIT');
  protected readonly aide = computed(() => TYPES_CATEGORIE.find((t) => t.type === this.type())!.aide);
  protected readonly liste = httpResource<CategorieAdmin[]>(() => ({ url: `${API_ADMIN}/categories`, params: { type: this.type() } }));
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly enCours = signal(false);
  protected readonly edition = signal<number | null>(null);
  protected nouvelle = '';
  protected nomEdite = '';

  private executer<T>(requete: import('rxjs').Observable<T>, succes: string, suite: (r: T) => void): void {
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
    this.executer(this.api.enregistrerCategorie(null, { type: this.type(), nom, icone: null, active: true }), `« ${nom} » ajoutée.`, (c) => {
      this.nouvelle = '';
      this.liste.value.update((l) => [...(l ?? []), c]);
    });
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
    const message = c.utilisations ? `Renommée : ${c.utilisations} contenu(s) mis à jour.` : 'Catégorie renommée.';
    this.executer(this.api.enregistrerCategorie(c.id, { type: c.type, nom, icone: c.icone, active: c.active }), message, (maj) => {
      this.edition.set(null);
      this.remplacer(maj);
    });
  }

  protected basculer(c: CategorieAdmin): void {
    this.executer(
      this.api.enregistrerCategorie(c.id, { type: c.type, nom: c.nom, icone: c.icone, active: !c.active }),
      c.active ? `« ${c.nom} » désactivée.` : `« ${c.nom} » activée.`,
      (maj) => this.remplacer(maj),
    );
  }

  protected deplacer(index: number, sens: -1 | 1): void {
    const ids = this.liste.value()!.map((c) => c.id);
    [ids[index], ids[index + sens]] = [ids[index + sens], ids[index]];
    this.executer(this.api.reordonnerCategories(this.type(), ids), '', (l) => this.liste.value.set(l));
  }

  protected async supprimer(c: CategorieAdmin): Promise<void> {
    const { ok } = await this.confirmation.demander({ titre: `Supprimer « ${c.nom} » ?`, message: 'Cette catégorie n’est utilisée par aucun contenu.', confirmer: 'Supprimer', danger: true });
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
  template: `
    @if (parametres.error() && !parametres.hasValue()) {
      <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
        <button class="btn-accent btn-sm mt-2" (click)="parametres.reload()">Réessayer</button>
      </app-etat-vide>
    } @else if (parametres.hasValue()) {
      <form class="space-y-5" (submit)="$event.preventDefault(); enregistrer()">
        @for (groupe of groupes(); track groupe.titre) {
          <fieldset>
            <legend class="mb-3 font-bold">{{ groupe.titre }}</legend>
            <div class="grid gap-4" [class.md:grid-cols-3]="groupe.court">
              @for (p of groupe.parametres; track p.cle) {
                <label class="block text-xs font-semibold text-muted-strong">
                  <span class="flex flex-wrap items-center gap-2">
                    {{ p.libelle }}
                    @if (!p.publique) {
                      <app-badge>Interne</app-badge>
                    }
                  </span>
                  @if (p.format === 'TEXTE_LONG') {
                    <textarea class="input mt-1 min-h-32 font-normal" [name]="p.cle" [(ngModel)]="valeurs[p.cle]" maxlength="20000"></textarea>
                  } @else {
                    <input
                      class="input mt-1 font-normal"
                      [type]="p.format === 'EMAIL' ? 'email' : p.format === 'TELEPHONE' ? 'tel' : 'text'"
                      [name]="p.cle"
                      [(ngModel)]="valeurs[p.cle]"
                      maxlength="500"
                    />
                  }
                  <span class="mt-1 block font-normal text-muted">
                    {{ p.description }}
                    @if (p.dateModification) {
                      · modifié le {{ dateHeure(p.dateModification) }}
                    }
                  </span>
                </label>
              }
            </div>
          </fieldset>
        }
        <div class="flex justify-end">
          <button class="btn-accent" type="submit" [disabled]="enregistrement()">
            @if (enregistrement()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
            }
            Enregistrer
          </button>
        </div>
      </form>
    } @else {
      <app-squelette [hauteur]="360" />
    }
  `,
})
export class TextesParametres {
  private readonly api = inject(AdminApi);
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
      this.valeurs = Object.fromEntries(this.parametres.value().map((p) => [p.cle, p.valeur ?? '']));
    });
  }

  protected enregistrer(): void {
    const valeurs = Object.fromEntries(Object.entries(this.valeurs).map(([cle, v]) => [cle, v?.trim() || null]));
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

type Onglet = 'compte' | 'categories' | 'textes';

@Component({
  selector: 'app-parametres',
  imports: [RouterLink, Icon, Avatar, Badge, CategoriesParametres, TextesParametres],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5">
      <h1 class="text-2xl font-extrabold">Paramètres</h1>
      <p class="mt-1 text-sm text-muted-strong">Votre compte, les catégories proposées dans l'application et ses textes.</p>
    </div>

    <div class="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-card p-1 sm:w-fit">
      @for (o of onglets; track o.cle) {
        <a class="onglet" [class.onglet-actif]="ongletActif() === o.cle" [routerLink]="[]" [queryParams]="{ onglet: o.cle }">
          <app-icon [name]="o.icone" [size]="16" /> {{ o.libelle }}
        </a>
      }
    </div>

    @if (ongletActif() === 'categories') {
      <section class="card p-4 sm:p-6"><app-categories-parametres /></section>
    } @else if (ongletActif() === 'textes') {
      <section class="card p-4 sm:p-6"><app-textes-parametres /></section>
    } @else {
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section class="card p-6">
        <h2 class="card-title mb-5">Mon compte</h2>
        @if (auth.profil(); as p) {
          <div class="flex items-center gap-4">
            <app-avatar [photo]="p.photoUrl" [nom]="p.nom" [size]="64" />
            <div>
              <p class="text-lg font-extrabold">{{ p.nom }}</p>
              <p class="text-sm text-muted-strong">{{ p.email }}</p>
              <app-badge class="mt-1.5" ton="accent">Administrateur</app-badge>
            </div>
          </div>
          <p class="mt-5 text-sm text-muted-strong">Membre depuis le {{ dateCourte(p.dateInscription) }}.</p>
        }
        <button class="btn-outline mt-6" (click)="deconnexion()"><app-icon name="sign-out" [size]="18" /> Se déconnecter</button>
      </section>

      <section class="card p-6">
        <h2 class="card-title mb-5">Connexion à la plateforme</h2>
        <dl class="space-y-4 text-sm">
          <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <dt class="text-muted-strong">API Bolono</dt>
            <dd class="flex flex-wrap items-center gap-2 font-mono text-xs break-all">
              {{ apiUrl }}
              @switch (etatApi()) {
                @case ('ok') {
                  <app-badge ton="succes">Joignable</app-badge>
                }
                @case ('ko') {
                  <app-badge ton="erreur">Injoignable</app-badge>
                }
                @default {
                  <app-badge>Vérification…</app-badge>
                }
              }
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4">
            <dt class="text-muted-strong">Projet Firebase</dt>
            <dd class="font-mono text-xs">{{ projetFirebase }}</dd>
          </div>
        </dl>
        <button class="btn-outline btn-sm mt-5" (click)="verifier()"><app-icon name="arrows-clockwise" [size]="15" /> Vérifier à nouveau</button>
      </section>

      <section class="card p-6 lg:col-span-2">
        <h2 class="card-title mb-3">Ajouter un administrateur</h2>
        <p class="text-sm text-muted-strong">
          Les comptes sont créés depuis l'application mobile. Pour donner l'accès au back-office à une personne, ouvrez sa fiche dans
          <a routerLink="/utilisateurs" class="link-accent">Utilisateurs</a> et utilisez le bouton « Accès admin ».
        </p>
      </section>
    </div>
    }
  `,
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
  ];
  /** Paramètre de requête ?onglet=… */
  readonly onglet = input<string>();
  protected readonly ongletActif = computed<Onglet>(() => {
    const o = this.onglet();
    return o === 'categories' || o === 'textes' ? o : 'compte';
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
