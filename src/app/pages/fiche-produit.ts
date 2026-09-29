import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../core/admin-api.service';
import { dateCourte, fcfa, mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { CategorieAdmin, ProduitAdmin, TypeProduit } from '../core/models';
import { API_ADMIN } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Panneau, Televersement } from '../shared/fenetres';
import { OptionNotification, notificationParDefaut } from '../shared/option-notification';
import { Icon } from '../shared/icon';
import { EtatVide, Squelette } from '../shared/ui';

export const LIBELLES_TYPE_PRODUIT: Record<TypeProduit, string> = {
  PRODUIT_FINI: 'Produit fini',
  MATIERE_PREMIERE: 'Matière première',
};

/** Fiche d'un produit : galerie, informations et modification. */
@Component({
  selector: 'app-fiche-produit',
  imports: [FormsModule, Icon, Panneau, Televersement, EtatVide, Squelette, OptionNotification],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-panneau titre="Fiche produit" largeur="max-w-xl" (fermer)="fermer.emit()">
      @if (fiche.error() && !fiche.hasValue()) {
        <app-etat-vide icone="warning" titre="Produit indisponible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="fiche.reload()">Réessayer</button>
        </app-etat-vide>
      } @else if (fiche.hasValue()) {
        @let p = fiche.value();
        <!-- Galerie -->
        <div class="overflow-hidden rounded-xl bg-sand">
          @if (mediaUrl(images()[imageActive()]); as src) {
            <img [src]="src" [alt]="p.nom" class="aspect-4/3 w-full object-cover" />
          } @else {
            <div class="flex aspect-4/3 items-center justify-center text-sand-deep"><app-icon name="image" [size]="48" /></div>
          }
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          @for (image of images(); track image; let i = $index) {
            <div class="group relative">
              <button
                type="button"
                class="block h-16 w-16 overflow-hidden rounded-lg ring-2 transition"
                [class]="i === imageActive() ? 'ring-terracotta' : 'ring-transparent hover:ring-sand-deep'"
                (click)="imageActive.set(i)"
                [attr.aria-label]="'Photo ' + (i + 1)"
              >
                <img [src]="mediaUrl(image)" alt="" class="h-full w-full object-cover" />
              </button>
              @if (edition()) {
                <div class="absolute -top-2 -right-2 hidden gap-1 group-hover:flex">
                  @if (i > 0) {
                    <button type="button" class="rounded-full bg-surface p-1 text-brown shadow" title="Photo principale" (click)="principale(i)">
                      <app-icon name="star" [size]="12" />
                    </button>
                  }
                  <button type="button" class="rounded-full bg-error p-1 text-white shadow" title="Retirer" (click)="retirerImage(i)">
                    <app-icon name="x" [size]="12" />
                  </button>
                </div>
              }
            </div>
          }
        </div>

        @if (!edition()) {
          <!-- Consultation -->
          <p class="mt-5 text-2xs font-semibold tracking-wide text-muted uppercase">
            {{ p.categorie ?? 'Sans catégorie' }} · {{ p.type ? typesProduit[p.type] : '—' }}
          </p>
          <h3 class="mt-1 text-xl font-extrabold">{{ p.nom }}</h3>
          <p class="mt-2 text-2xl font-extrabold text-terracotta">{{ fcfa(p.prixFCFA) }}</p>
          @if (p.description) {
            <p class="mt-3 text-sm whitespace-pre-line text-muted-strong">{{ p.description }}</p>
          }
          <dl class="mt-5 grid grid-cols-2 gap-3 text-ms">
            @for (
              ligne of [
                { l: 'Stock', v: (p.stock ?? '—') + ' ' + (p.uniteMesure ?? '') },
                { l: 'Vendus', v: nombre(p.ventes) },
                { l: 'Vendeur', v: p.vendeur ?? '—' },
                { l: 'Ajouté le', v: dateCourte(p.dateCreation) },
                { l: 'Prix en euros', v: p.prixEUR ? p.prixEUR + ' €' : '—' },
              ];
              track ligne.l
            ) {
              <div class="rounded-xl bg-ochre-surface px-3 py-2.5">
                <dt class="text-2xs text-muted-strong">{{ ligne.l }}</dt>
                <dd class="font-semibold">{{ ligne.v }}</dd>
              </div>
            }
          </dl>
        } @else {
          <!-- Modification -->
          <form id="form-produit" class="mt-5 space-y-3.5" (submit)="$event.preventDefault(); enregistrer()">
            <div>
              <p class="mb-1.5 text-xs font-semibold text-muted-strong">Ajouter une photo</p>
              <app-televersement categorie="PRODUIT_IMAGE" [url]="null" [effacable]="false" hauteurVide="h-24" (urlChange)="ajouterImage($event)" />
            </div>
            <label class="block text-xs font-semibold text-muted-strong">
              Nom
              <input class="input mt-1" name="nom" [(ngModel)]="formulaire.nom" required maxlength="150" />
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="block text-xs font-semibold text-muted-strong">
                Catégorie
                <select class="input mt-1" name="categorie" [(ngModel)]="formulaire.categorie">
                  <option [ngValue]="null">Sans catégorie</option>
                  @for (c of categoriesProposees(); track c.id) {
                    <option [ngValue]="c.nom">{{ c.nom }}{{ c.active ? '' : ' (désactivée)' }}</option>
                  }
                </select>
              </label>
              <label class="block text-xs font-semibold text-muted-strong">
                Type
                <select class="input mt-1" name="type" [(ngModel)]="formulaire.typeProduit">
                  <option ngValue="PRODUIT_FINI">Produit fini</option>
                  <option ngValue="MATIERE_PREMIERE">Matière première</option>
                </select>
              </label>
              <label class="block text-xs font-semibold text-muted-strong">
                Prix (FCFA)
                <input type="number" min="1" class="input mt-1" name="prix" [(ngModel)]="formulaire.prixFCFA" required />
              </label>
              <label class="block text-xs font-semibold text-muted-strong">
                Prix (€, facultatif)
                <input type="number" min="0" step="0.01" class="input mt-1" name="prixEur" [(ngModel)]="formulaire.prixEUR" />
              </label>
              <label class="block text-xs font-semibold text-muted-strong">
                Stock
                <input type="number" min="0" class="input mt-1" name="stock" [(ngModel)]="formulaire.stock" />
              </label>
              <label class="block text-xs font-semibold text-muted-strong">
                Unité
                <input class="input mt-1" name="unite" placeholder="pièce, kg, m…" [(ngModel)]="formulaire.uniteMesure" maxlength="30" />
              </label>
            </div>
            <label class="block text-xs font-semibold text-muted-strong">
              Description
              <textarea class="input mt-1 min-h-28" name="description" [(ngModel)]="formulaire.description" maxlength="5000"></textarea>
            </label>
            <app-option-notification [destinataire]="p.vendeur ?? 'le vendeur'" [(valeur)]="notification" />
          </form>
        }
      } @else {
        <app-squelette [hauteur]="260" />
        <app-squelette class="mt-4" [hauteur]="24" />
        <app-squelette class="mt-2 w-1/2" [hauteur]="20" />
      }

      <div pied class="flex gap-2 border-t border-line bg-ivory/60 px-5 py-4 sm:px-6">
        @if (edition()) {
          <button class="btn-outline flex-1" [disabled]="enregistrement()" (click)="annulerEdition()">Annuler</button>
          <button class="btn-accent flex-1" type="submit" form="form-produit" [disabled]="enregistrement()">
            @if (enregistrement()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
            }
            Enregistrer
          </button>
        } @else {
          <button class="btn-primary flex-1" [disabled]="!fiche.hasValue()" (click)="commencerEdition()">
            <app-icon name="gear-six" [size]="17" /> Modifier le produit
          </button>
        }
      </div>
    </app-panneau>
  `,
})
export class FicheProduit {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  protected readonly fcfa = fcfa;
  protected readonly nombre = nombre;
  protected readonly dateCourte = dateCourte;
  protected readonly mediaUrl = mediaUrl;
  protected readonly typesProduit = LIBELLES_TYPE_PRODUIT;

  readonly id = input.required<number>();
  readonly fermer = output<void>();
  readonly modifie = output<ProduitAdmin>();

  protected readonly fiche = httpResource<ProduitAdmin>(() => `${API_ADMIN}/produits/${this.id()}`);
  protected readonly categories = httpResource<CategorieAdmin[]>(() => ({ url: `${API_ADMIN}/categories`, params: { type: 'PRODUIT' } }), {
    defaultValue: [],
  });
  protected readonly erreur = computed(() => messageApi(this.fiche.error()));
  protected readonly edition = signal(false);
  protected readonly enregistrement = signal(false);
  protected readonly imageActive = signal(0);
  /** Photos affichées : celles du produit, ou celles en cours de modification. */
  protected readonly images = signal<string[]>([]);

  /** Catégories actives, plus la catégorie actuelle du produit si elle a été désactivée. */
  protected readonly categoriesProposees = computed(() =>
    this.categories.value().filter((c) => c.active || c.nom === this.formulaire.categorie),
  );

  protected notification = notificationParDefaut();
  protected formulaire = {
    nom: '',
    description: '',
    prixFCFA: 0,
    prixEUR: null as number | null,
    stock: null as number | null,
    uniteMesure: '',
    typeProduit: 'PRODUIT_FINI' as TypeProduit,
    categorie: null as string | null,
  };

  constructor() {
    // Galerie synchronisée sur la fiche chargée (hors mode édition).
    effect(() => {
      if (this.fiche.hasValue() && !this.edition()) {
        this.images.set(this.fiche.value().images);
        this.imageActive.set(0);
      }
    });
  }

  protected commencerEdition(): void {
    const p = this.fiche.value()!;
    this.formulaire = {
      nom: p.nom,
      description: p.description ?? '',
      prixFCFA: p.prixFCFA,
      prixEUR: p.prixEUR,
      stock: p.stock,
      uniteMesure: p.uniteMesure ?? '',
      typeProduit: p.type ?? 'PRODUIT_FINI',
      categorie: p.categorie,
    };
    this.notification = notificationParDefaut();
    this.edition.set(true);
  }

  protected annulerEdition(): void {
    this.edition.set(false);
  }

  protected ajouterImage(url: string | null): void {
    if (url) {
      this.images.update((liste) => [...liste, url]);
      this.imageActive.set(this.images().length - 1);
    }
  }

  protected retirerImage(i: number): void {
    this.images.update((liste) => liste.filter((_, k) => k !== i));
    this.imageActive.set(0);
  }

  protected principale(i: number): void {
    this.images.update((liste) => [liste[i], ...liste.filter((_, k) => k !== i)]);
    this.imageActive.set(0);
  }

  protected enregistrer(): void {
    const f = this.formulaire;
    if (!f.nom.trim() || !(f.prixFCFA > 0)) {
      this.toast.erreur('Le nom et un prix positif sont obligatoires.');
      return;
    }
    this.enregistrement.set(true);
    this.api
      .modifierProduit(this.id(), {
        nom: f.nom.trim(),
        description: f.description.trim() || null,
        prixFCFA: f.prixFCFA,
        prixEUR: f.prixEUR || null,
        stock: f.stock,
        uniteMesure: f.uniteMesure.trim() || null,
        typeProduit: f.typeProduit,
        categorie: f.categorie,
        images: this.images(),
      }, this.notification)
      .subscribe({
        next: (produit) => {
          this.enregistrement.set(false);
          this.fiche.value.set(produit);
          this.edition.set(false);
          this.toast.succes(`« ${produit.nom} » a été mis à jour.`);
          this.modifie.emit(produit);
        },
        error: (e) => {
          this.enregistrement.set(false);
          this.toast.erreur(messageApi(e));
        },
      });
  }
}
