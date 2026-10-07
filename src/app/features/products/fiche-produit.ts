import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductsService } from './products.service';
import { dateCourte, fcfa, mediaUrl, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { CategorieAdmin } from '../settings/settings.model';
import type { ProduitAdmin, TypeProduit } from './products.model';
import { API_ADMIN } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Panneau, Televersement } from '../../shared/dialogs/fenetres';
import { OptionNotification, notificationParDefaut } from '../../shared/components/option-notification';
import { Icon } from '../../shared/icons/icon';
import { EtatVide, Squelette } from '../../shared/components/ui';

export const LIBELLES_TYPE_PRODUIT: Record<TypeProduit, string> = {
  PRODUIT_FINI: 'Produit fini',
  MATIERE_PREMIERE: 'Matière première',
};

/** Fiche d'un produit : galerie, informations et modification. */
@Component({
  selector: 'app-fiche-produit',
  imports: [FormsModule, Icon, Panneau, Televersement, EtatVide, Squelette, OptionNotification],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fiche-produit.html',
})
export class FicheProduit {
  private readonly api = inject(ProductsService);
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
  protected readonly categories = httpResource<CategorieAdmin[]>(
    () => ({ url: `${API_ADMIN}/categories`, params: { type: 'PRODUIT' } }),
    {
      defaultValue: [],
    },
  );
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
      .modifierProduit(
        this.id(),
        {
          nom: f.nom.trim(),
          description: f.description.trim() || null,
          prixFCFA: f.prixFCFA,
          prixEUR: f.prixEUR || null,
          stock: f.stock,
          uniteMesure: f.uniteMesure.trim() || null,
          typeProduit: f.typeProduit,
          categorie: f.categorie,
          images: this.images(),
        },
        this.notification,
      )
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
