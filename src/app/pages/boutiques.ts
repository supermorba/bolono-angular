import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../core/admin-api.service';
import { dateCourte, dateHeure, fcfa, mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { BoutiqueAdmin, BoutiqueAdminDetail, CompteursBoutiques, Page, StatutBoutique } from '../core/models';
import { API_ADMIN, derniereValeur, rechargerEnDirect, sansVides } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Panneau } from '../shared/fenetres';
import { Icon } from '../shared/icon';
import { Badge, BarreChargement, ConfirmationService, EntetePage, EtatVide, Pagination, Squelette, type Ton } from '../shared/ui';

const TAILLE_PAGE = 15;

export const STATUTS_BOUTIQUE: Record<StatutBoutique, { libelle: string; ton: Ton }> = {
  OUVERTE: { libelle: 'Ouverte', ton: 'succes' },
  FERMEE: { libelle: 'Fermée par le vendeur', ton: 'neutre' },
  MASQUEE: { libelle: 'Masquée', ton: 'erreur' },
};

const LIBELLES_VERSEMENT: Record<string, string> = { ORANGE_MONEY: 'Orange Money', WAVE: 'Wave' };

/** Logo de boutique, ou initiale sur fond sable. */
@Component({
  selector: 'app-logo-boutique',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    @if (src() && !enErreur()) {
      <img [src]="src()" alt="" class="rounded-xl object-cover" [style.width.px]="taille()" [style.height.px]="taille()" (error)="enErreur.set(true)" />
    } @else {
      <span class="flex items-center justify-center rounded-xl bg-sand text-brown" [style.width.px]="taille()" [style.height.px]="taille()">
        <app-icon name="storefront" [size]="taille() * 0.5" />
      </span>
    }
  `,
})
export class LogoBoutique {
  readonly url = input<string | null>(null);
  readonly taille = input(40);
  protected readonly enErreur = signal(false);
  protected readonly src = computed(() => mediaUrl(this.url()));
}

/** Panneau latéral : fiche d'une boutique et modération (masquer / rétablir). */
@Component({
  selector: 'app-fiche-boutique',
  imports: [RouterLink, Icon, Badge, EtatVide, Squelette, Panneau, LogoBoutique],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-panneau titre="Fiche boutique" (fermer)="fermer.emit()">
      @if (fiche.error() && !fiche.hasValue()) {
        <app-etat-vide icone="warning" titre="Fiche indisponible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="fiche.reload()">Réessayer</button>
        </app-etat-vide>
      } @else if (fiche.hasValue()) {
        @let d = fiche.value();
        @let b = d.boutique;
        @if (banniere(); as src) {
          <img [src]="src" alt="" class="-mx-5 -mt-5 mb-5 h-32 w-[calc(100%+2.5rem)] max-w-none object-cover sm:-mx-6 sm:w-[calc(100%+3rem)]" />
        }
        <div class="flex items-center gap-4">
          <app-logo-boutique [url]="b.logoUrl" [taille]="64" />
          <div class="min-w-0">
            <p class="truncate text-xl font-bold">{{ b.nom }}</p>
            <p class="text-sm text-muted-strong">{{ b.categorie || '—' }} · {{ b.ville || '—' }}</p>
            <app-badge class="mt-1.5" [ton]="statuts[b.statut].ton">{{ statuts[b.statut].libelle }}</app-badge>
          </div>
        </div>

        @if (b.statut === 'MASQUEE') {
          <div class="mt-5 rounded-xl border border-error/20 bg-error-surface p-3.5 text-sm text-error">
            <p class="flex items-center gap-2 font-semibold"><app-icon name="eye-slash" [size]="16" /> Masquée le {{ dateHeure(d.dateMasquage) }}</p>
            <p class="mt-1 text-error/90">{{ d.motifMasquage ? 'Motif : ' + d.motifMasquage : 'Aucun motif indiqué.' }}</p>
            <p class="mt-1 text-xs text-error/80">Ni la boutique ni ses produits ne sont visibles ; le vendeur ne peut pas la rouvrir.</p>
          </div>
        }

        @if (d.description) {
          <p class="mt-5 text-sm whitespace-pre-line text-muted-strong">{{ d.description }}</p>
        }

        <p class="mt-7 mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">Activité</p>
        <div class="grid grid-cols-3 gap-2.5">
          @for (s of [
            { v: nombre(b.produitsEnLigne) + ' / ' + nombre(b.produits), l: 'produits en ligne' },
            { v: nombre(b.ventes), l: 'commandes vendues' },
            { v: fcfa(b.chiffreAffaires), l: "chiffre d'affaires" },
          ]; track s.l) {
            <div class="rounded-xl bg-ochre-surface px-3 py-2.5">
              <p class="truncate text-lg font-bold">{{ s.v }}</p>
              <p class="text-2xs leading-tight text-muted-strong">{{ s.l }}</p>
            </div>
          }
        </div>

        <p class="mt-7 mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">Vendeur</p>
        <a [routerLink]="['/utilisateurs']" [queryParams]="{ id: b.proprietaireId }" class="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 transition hover:border-sand-deep hover:bg-ochre-surface">
          <app-icon name="user" [size]="18" class="text-terracotta" />
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold">{{ b.proprietaire }}</span>
            <span class="block truncate text-xs text-muted">{{ b.proprietaireEmail }}</span>
          </span>
          @if (b.proprietaireSuspendu) {
            <app-badge ton="erreur">Suspendu</app-badge>
          }
          <app-icon name="caret-right" [size]="15" class="text-muted" />
        </a>

        <p class="mt-7 mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">Coordonnées et versements</p>
        <dl class="space-y-2.5 text-sm">
          @for (l of [
            { l: 'Adresse', v: d.adresse },
            { l: 'Téléphone', v: d.telephone },
            { l: 'WhatsApp', v: d.lienWhatsapp },
            { l: 'Compte de versement', v: d.numeroVersement ? (versement[d.moyenVersement ?? ''] ?? d.moyenVersement ?? '') + ' · ' + d.numeroVersement : null },
            { l: 'Créée le', v: dateCourte(b.dateCreation) },
          ]; track l.l) {
            <div class="flex justify-between gap-4"><dt class="text-muted">{{ l.l }}</dt><dd class="text-right font-medium break-words">{{ l.v || '—' }}</dd></div>
          }
        </dl>
      } @else {
        <app-squelette [hauteur]="64" />
        <app-squelette class="mt-5" [hauteur]="180" />
      }

      @if (fiche.hasValue()) {
        <div pied class="border-t border-line bg-ivory/60 px-5 py-4 sm:px-6">
          @if (fiche.value().boutique.statut === 'MASQUEE') {
            <button class="btn-accent w-full" [disabled]="enCours()" (click)="changerVisibilite(true)">
              <app-icon name="eye" [size]="17" /> Rétablir la boutique
            </button>
          } @else {
            <button class="btn-outline w-full text-error!" [disabled]="enCours()" (click)="changerVisibilite(false)">
              <app-icon name="eye-slash" [size]="17" /> Masquer la boutique
            </button>
          }
        </div>
      }
    </app-panneau>
  `,
})
export class FicheBoutique {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly fcfa = fcfa;
  protected readonly nombre = nombre;
  protected readonly dateCourte = dateCourte;
  protected readonly dateHeure = dateHeure;
  protected readonly statuts = STATUTS_BOUTIQUE;
  protected readonly versement = LIBELLES_VERSEMENT;

  readonly id = input.required<number>();
  readonly fermer = output<void>();
  readonly modifie = output<void>();

  protected readonly fiche = httpResource<BoutiqueAdminDetail>(() => `${API_ADMIN}/boutiques/${this.id()}`);
  protected readonly erreur = computed(() => messageApi(this.fiche.error()));
  protected readonly banniere = computed(() => (this.fiche.hasValue() ? mediaUrl(this.fiche.value().banniereUrl) : null));
  protected readonly enCours = signal(false);

  protected async changerVisibilite(visible: boolean): Promise<void> {
    const b = this.fiche.value()!.boutique;
    const { ok, texte, notification } = await this.confirmation.demander(
      visible
        ? {
            titre: `Rétablir « ${b.nom} » ?`,
            message: 'La boutique et ses produits en ligne redeviennent visibles dans l’application.',
            confirmer: 'Rétablir',
            notification: b.proprietaire,
          }
        : {
            titre: `Masquer « ${b.nom} » ?`,
            message: 'La boutique et tous ses produits disparaissent de l’application. Le vendeur ne pourra pas la rouvrir lui-même.',
            confirmer: 'Masquer',
            danger: true,
            champ: { libelle: 'Motif (montré au vendeur)', obligatoire: true },
            notification: b.proprietaire,
          },
    );
    if (!ok) return;
    this.enCours.set(true);
    this.api.changerVisibiliteBoutique(b.id, visible, texte, notification).subscribe({
      next: (d) => {
        this.enCours.set(false);
        this.fiche.set(d);
        this.toast.succes(visible ? `« ${b.nom} » est de nouveau visible.` : `« ${b.nom} » a été masquée.`);
        this.modifie.emit();
      },
      error: (e) => {
        this.enCours.set(false);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}

@Component({
  selector: 'app-boutiques',
  imports: [EntetePage, Icon, Badge, BarreChargement, EtatVide, Pagination, Squelette, FicheBoutique, LogoBoutique],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-entete-page rubrique="Boutique" titre="Boutiques">
      Les boutiques ouvertes par les vendeurs. Masquez celles qui ne respectent pas les règles : elles disparaissent avec leurs produits.
    </app-entete-page>

    <div class="card relative p-4 sm:p-5">
      <app-barre-chargement [actif]="liste.isLoading() && !!page()" />

      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="onglets" role="tablist" aria-label="Statut">
          @for (o of onglets(); track o.valeur) {
            <button class="onglet" [class.onglet-actif]="statut() === o.valeur" role="tab" [attr.aria-selected]="statut() === o.valeur" (click)="statut.set(o.valeur)">
              {{ o.libelle }}
              <span class="rounded-full bg-sand/60 px-1.5 text-2xs leading-4 text-brown">{{ o.compte ?? '…' }}</span>
            </button>
          }
        </div>
        <div class="relative w-full sm:ml-auto sm:max-w-xs">
          <app-icon name="magnifying-glass" [size]="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input type="search" class="input py-2! pl-9!" placeholder="Boutique ou vendeur" [value]="saisie()" (input)="saisir($any($event.target).value)" aria-label="Rechercher une boutique" />
        </div>
      </div>

      @if (liste.error() && !page()) {
        <app-etat-vide icone="warning" titre="Chargement impossible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="liste.reload()">Réessayer</button>
        </app-etat-vide>
      } @else if (page(); as p) {
        @if (p.content.length) {
          <div class="overflow-x-auto transition-opacity" [class.opacity-60]="liste.isLoading()">
            <table class="table">
              <thead>
                <tr>
                  <th>Boutique</th>
                  <th class="hidden md:table-cell">Vendeur</th>
                  <th class="hidden sm:table-cell text-right">Produits</th>
                  <th class="hidden lg:table-cell text-right">Ventes</th>
                  <th class="hidden lg:table-cell text-right">Chiffre d'affaires</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (b of p.content; track b.id) {
                  <tr class="cursor-pointer" [class.bg-terracotta-light!]="selection() === b.id" (click)="selection.set(b.id)" (keydown.enter)="selection.set(b.id)" tabindex="0">
                    <td>
                      <div class="flex max-w-60 items-center gap-3 sm:max-w-none">
                        <app-logo-boutique [url]="b.logoUrl" [taille]="38" />
                        <div class="min-w-0">
                          <p class="truncate font-semibold">{{ b.nom }}</p>
                          <p class="truncate text-xs text-muted">{{ b.categorie || '—' }} · {{ b.ville || '—' }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="hidden md:table-cell">
                      <p class="truncate font-medium">{{ b.proprietaire }}</p>
                      @if (b.proprietaireSuspendu) {
                        <p class="text-2xs font-semibold text-error">Compte suspendu</p>
                      }
                    </td>
                    <td class="hidden text-right whitespace-nowrap sm:table-cell">
                      <span class="font-semibold">{{ nombre(b.produitsEnLigne) }}</span> <span class="text-muted">/ {{ nombre(b.produits) }}</span>
                    </td>
                    <td class="hidden text-right lg:table-cell">{{ nombre(b.ventes) }}</td>
                    <td class="hidden text-right whitespace-nowrap lg:table-cell">{{ fcfa(b.chiffreAffaires) }}</td>
                    <td><app-badge [ton]="statuts[b.statut].ton">{{ statuts[b.statut].libelle }}</app-badge></td>
                    <td class="text-right"><app-icon name="caret-right" [size]="16" class="text-muted" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination [page]="p.number" [pages]="p.totalPages" [total]="p.totalElements" (changer)="numero.set($event)" />
        } @else {
          <app-etat-vide icone="storefront" titre="Aucune boutique" [message]="recherche() ? 'Aucune boutique ne correspond à « ' + recherche() + ' ».' : 'Aucune boutique ne correspond à ce filtre.'" />
        }
      } @else {
        @for (i of lignesSquelette; track i) {
          <app-squelette class="my-2" [hauteur]="44" />
        }
      }
    </div>

    @if (selection(); as id) {
      <app-fiche-boutique [id]="id" (fermer)="selection.set(null)" (modifie)="rafraichir()" />
    }
  `,
})
export class BoutiquesPage {
  protected readonly fcfa = fcfa;
  protected readonly nombre = nombre;
  protected readonly statuts = STATUTS_BOUTIQUE;
  protected readonly lignesSquelette = Array.from({ length: 6 }, (_, i) => i);

  /** Recherche (?q=) et lien direct vers une fiche (?id=). */
  readonly q = input<string>();
  readonly idFiche = input<string>(undefined, { alias: 'id' });

  protected readonly saisie = linkedSignal(() => this.q() ?? '');
  protected readonly recherche = linkedSignal(() => this.q() ?? '');
  protected readonly statut = signal<StatutBoutique | ''>('');
  protected readonly numero = linkedSignal(() => {
    this.recherche();
    this.statut();
    return 0;
  });
  protected readonly selection = linkedSignal<number | null>(() => {
    const id = Number(this.idFiche());
    return Number.isInteger(id) && id > 0 ? id : null;
  });

  protected readonly liste = httpResource<Page<BoutiqueAdmin>>(() => ({
    url: `${API_ADMIN}/boutiques`,
    params: sansVides({ q: this.recherche().trim(), statut: this.statut(), page: this.numero(), size: TAILLE_PAGE }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly compteurs = httpResource<CompteursBoutiques>(() => `${API_ADMIN}/boutiques/compteurs`);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));

  protected readonly onglets = computed(() => {
    const c = this.compteurs.hasValue() ? this.compteurs.value() : null;
    return [
      { valeur: '' as const, libelle: 'Toutes', compte: c?.toutes },
      { valeur: 'OUVERTE' as const, libelle: 'Ouvertes', compte: c?.ouvertes },
      { valeur: 'FERMEE' as const, libelle: 'Fermées', compte: c?.fermees },
      { valeur: 'MASQUEE' as const, libelle: 'Masquées', compte: c?.masquees },
    ];
  });

  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    rechargerEnDirect(this.liste);
    rechargerEnDirect(this.compteurs);
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected saisir(texte: string): void {
    this.saisie.set(texte);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recherche.set(texte), 300);
  }

  protected rafraichir(): void {
    this.liste.reload();
    this.compteurs.reload();
  }
}
