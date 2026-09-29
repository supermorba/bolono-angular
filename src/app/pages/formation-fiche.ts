import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminApi } from '../core/admin-api.service';
import { mediaUrl, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { CategorieAdmin, FormationDetailAdmin, ModuleAdmin, Page, UtilisateurAdmin } from '../core/models';
import { API_ADMIN } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Modale, Televersement } from '../shared/fenetres';
import { OptionNotification, notificationParDefaut } from '../shared/option-notification';
import { Icon } from '../shared/icon';
import { Badge, ConfirmationService, EtatVide, Squelette } from '../shared/ui';
import { EditeurQuiz } from './editeur-quiz';

const NIVEAUX = ['Débutant', 'Intermédiaire', 'Avancé'];

/** « 5 min 20 s », « 1 h 05 min ». */
export function duree(secondes: number): string {
  if (!secondes) return '0 min';
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = secondes % 60;
  if (h) return `${h} h ${String(m).padStart(2, '0')} min`;
  return s ? `${m} min ${String(s).padStart(2, '0')} s` : `${m} min`;
}

/** Fenêtre d'ajout ou de modification d'un module vidéo. */
@Component({
  selector: 'app-module-formation',
  imports: [FormsModule, Modale, Televersement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modale [titre]="module() ? 'Modifier le module' : 'Nouveau module'" largeur="max-w-xl" (fermer)="fermer.emit()">
      <form id="form-module" class="space-y-3.5" (submit)="$event.preventDefault(); enregistrer()">
        <label class="block text-xs font-semibold text-muted-strong">
          Titre
          <input class="input mt-1" name="titre" [(ngModel)]="modele.titre" required maxlength="200" />
        </label>
        <div>
          <p class="mb-1.5 text-xs font-semibold text-muted-strong">Vidéo de la leçon</p>
          <app-televersement categorie="FORMATION_COURS" [url]="modele.urlVideo" (urlChange)="modele.urlVideo = $event ?? ''" (duree)="modele.dureeSecondes = $event" [effacable]="false" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label class="block text-xs font-semibold text-muted-strong">
            Durée (minutes)
            <input type="number" min="0" class="input mt-1" name="min" [ngModel]="minutes()" (ngModelChange)="majDuree($event, secondes())" />
          </label>
          <label class="block text-xs font-semibold text-muted-strong">
            et secondes
            <input type="number" min="0" max="59" class="input mt-1" name="sec" [ngModel]="secondes()" (ngModelChange)="majDuree(minutes(), $event)" />
          </label>
        </div>
        <label class="block text-xs font-semibold text-muted-strong">
          Description (facultative)
          <textarea class="input mt-1 min-h-20" name="description" [(ngModel)]="modele.description"></textarea>
        </label>
        <label class="flex items-center gap-2 text-ms">
          <input type="checkbox" class="h-4 w-4 accent-terracotta" name="horsLigne" [(ngModel)]="modele.disponibleHorsLigne" />
          Téléchargeable pour un visionnage hors connexion
        </label>
      </form>
      <ng-container pied>
        <button class="btn-outline" (click)="fermer.emit()">Annuler</button>
        <button class="btn-accent" type="submit" form="form-module" [disabled]="enregistrement()">
          @if (enregistrement()) {
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
          }
          Enregistrer
        </button>
      </ng-container>
    </app-modale>
  `,
})
export class ModuleFormation {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);

  readonly formationId = input.required<number>();
  readonly module = input<ModuleAdmin | null>(null);
  readonly fermer = output<void>();
  readonly enregistre = output<FormationDetailAdmin>();

  protected readonly enregistrement = signal(false);
  protected modele = { titre: '', description: '', urlVideo: '', dureeSecondes: 0, disponibleHorsLigne: false };
  protected readonly minutes = () => Math.floor(this.modele.dureeSecondes / 60);
  protected readonly secondes = () => this.modele.dureeSecondes % 60;

  ngOnInit(): void {
    const m = this.module();
    if (m) {
      this.modele = {
        titre: m.titre,
        description: m.description ?? '',
        urlVideo: m.urlVideo,
        dureeSecondes: m.dureeSecondes,
        disponibleHorsLigne: m.disponibleHorsLigne,
      };
    }
  }

  protected majDuree(minutes: number, secondes: number): void {
    this.modele.dureeSecondes = Math.max(0, (+minutes || 0) * 60 + Math.min(59, +secondes || 0));
  }

  protected enregistrer(): void {
    if (!this.modele.titre.trim() || !this.modele.urlVideo) {
      this.toast.erreur('Le titre et la vidéo sont obligatoires.');
      return;
    }
    const req = {
      titre: this.modele.titre.trim(),
      description: this.modele.description.trim() || null,
      urlVideo: this.modele.urlVideo,
      dureeSecondes: this.modele.dureeSecondes,
      disponibleHorsLigne: this.modele.disponibleHorsLigne,
    };
    const m = this.module();
    this.enregistrement.set(true);
    (m ? this.api.modifierModule(m.id, req) : this.api.ajouterModule(this.formationId(), req)).subscribe({
      next: (f) => {
        this.enregistrement.set(false);
        this.toast.succes(m ? 'Module mis à jour.' : 'Module ajouté.');
        this.enregistre.emit(f);
      },
      error: (e) => {
        this.enregistrement.set(false);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}

/** Création (/formations/nouvelle) et fiche détaillée (/formations/:id) d'une formation. */
@Component({
  selector: 'app-formation-fiche',
  imports: [FormsModule, RouterLink, Icon, Badge, EtatVide, Squelette, Televersement, ModuleFormation, EditeurQuiz, OptionNotification],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/formations" class="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-strong hover:text-brown">
      <app-icon name="caret-left" [size]="14" /> Formations
    </a>

    @if (!nouvelle() && fiche.error() && !fiche.hasValue()) {
      <div class="card">
        <app-etat-vide icone="warning" titre="Formation indisponible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="fiche.reload()">Réessayer</button>
        </app-etat-vide>
      </div>
    } @else if (nouvelle() || fiche.hasValue()) {
      <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
          <h1 class="truncate text-2xl font-extrabold">{{ nouvelle() ? 'Nouvelle formation' : fiche.value()?.titre }}</h1>
          <p class="mt-1 text-sm text-muted-strong">
            {{ nouvelle() ? 'Renseignez les informations, puis ajoutez les modules vidéo.' : 'Informations, modules vidéo et quiz.' }}
          </p>
        </div>
        @if (!nouvelle()) {
          <button class="btn-outline btn-sm text-error!" (click)="supprimer()"><app-icon name="trash" [size]="15" /> Supprimer la formation</button>
        }
      </div>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div class="flex min-w-0 flex-col gap-5">
          <!-- Informations -->
          <form class="card p-4 sm:p-5" (submit)="$event.preventDefault(); enregistrer()">
            <h2 class="card-title mb-4">Informations</h2>
            <div class="grid gap-3.5 md:grid-cols-2">
              <label class="block text-xs font-semibold text-muted-strong md:col-span-2">
                Titre
                <input class="input mt-1" name="titre" [(ngModel)]="modele.titre" required maxlength="200" />
              </label>
              <label class="block text-xs font-semibold text-muted-strong">
                Catégorie
                <select class="input mt-1" name="categorie" [(ngModel)]="modele.categorie" required>
                  <option value="" disabled>Choisir…</option>
                  @for (c of categoriesProposees(); track c.id) {
                    <option [value]="c.nom">{{ c.nom }}{{ c.active ? '' : ' (désactivée)' }}</option>
                  }
                </select>
              </label>
              <label class="block text-xs font-semibold text-muted-strong">
                Niveau
                <select class="input mt-1" name="niveau" [(ngModel)]="modele.niveau">
                  <option [ngValue]="null">Non précisé</option>
                  @for (n of niveaux; track n) {
                    <option [ngValue]="n">{{ n }}</option>
                  }
                </select>
              </label>
              <label class="block text-xs font-semibold text-muted-strong md:col-span-2">
                Mentor auteur
                <select class="input mt-1" name="auteur" [(ngModel)]="modele.auteurId">
                  <option [ngValue]="null">{{ nouvelle() ? 'Moi (administrateur)' : 'Inchangé' }}</option>
                  @for (m of mentors(); track m.id) {
                    <option [ngValue]="m.id">{{ m.nom }}{{ m.specialite ? ' — ' + m.specialite : '' }}</option>
                  }
                </select>
              </label>
              <label class="block text-xs font-semibold text-muted-strong md:col-span-2">
                Description
                <textarea class="input mt-1 min-h-28" name="description" [(ngModel)]="modele.description"></textarea>
              </label>
              <div class="md:col-span-2">
                <p class="mb-1.5 text-xs font-semibold text-muted-strong">Image de couverture</p>
                <app-televersement categorie="FORMATION_BANNIERE" [(url)]="modele.miniatureUrl" hauteurApercu="max-h-56" />
              </div>
            </div>
            @if (!nouvelle()) {
              <app-option-notification class="mt-5 block" [destinataire]="fiche.value()?.auteur?.nom ?? 'le mentor'" [(valeur)]="notification" />
            }
            <div class="mt-5 flex justify-end">
              <button class="btn-accent" type="submit" [disabled]="enregistrement()">
                @if (enregistrement()) {
                  <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                }
                {{ nouvelle() ? 'Créer la formation' : 'Enregistrer les modifications' }}
              </button>
            </div>
          </form>

          <!-- Modules -->
          @if (fiche.hasValue(); as _) {
            @let f = fiche.value()!;
            <section class="card p-4 sm:p-5">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 class="card-title">Modules ({{ f.modules.length }})</h2>
                <button class="btn-primary btn-sm" (click)="moduleEdite.set('nouveau')"><app-icon name="play-circle" [size]="15" /> Ajouter un module</button>
              </div>
              @if (f.modules.length) {
                <ol class="space-y-2.5">
                  @for (m of f.modules; track m.id; let i = $index, premier = $first, dernier = $last) {
                    <li class="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3 sm:flex-nowrap">
                      <div class="flex flex-col">
                        <button class="rounded p-0.5 text-muted hover:text-brown disabled:opacity-25" [disabled]="premier || reordonnancement()" (click)="deplacer(i, -1)" aria-label="Monter">
                          <app-icon name="arrow-up" [size]="14" />
                        </button>
                        <button class="rounded p-0.5 text-muted hover:text-brown disabled:opacity-25" [disabled]="dernier || reordonnancement()" (click)="deplacer(i, 1)" aria-label="Descendre">
                          <app-icon name="arrow-down" [size]="14" />
                        </button>
                      </div>
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-surface text-sm font-bold text-info">{{ m.ordre }}</span>
                      <div class="min-w-0 flex-1">
                        <p class="truncate font-semibold">{{ m.titre }}</p>
                        <p class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span>{{ duree(m.dureeSecondes) }}</span>
                          <span>{{ nombre(m.termines) }} apprenant{{ m.termines > 1 ? 's' : '' }} l'ont terminé</span>
                          @if (m.disponibleHorsLigne) {
                            <app-badge ton="info">Hors ligne</app-badge>
                          }
                          @if (m.quiz; as q) {
                            <app-badge ton="accent">Quiz · {{ q.questions }} question{{ q.questions > 1 ? 's' : '' }}</app-badge>
                          }
                        </p>
                      </div>
                      <div class="flex shrink-0 gap-1">
                        <button class="btn-outline btn-sm" (click)="quizModule.set(m)">
                          <app-icon name="check-circle" [size]="14" /> {{ m.quiz ? 'Quiz' : 'Ajouter un quiz' }}
                        </button>
                        <button class="rounded-lg p-2 text-muted hover:bg-card hover:text-brown" (click)="moduleEdite.set(m)" aria-label="Modifier le module">
                          <app-icon name="gear-six" [size]="17" />
                        </button>
                        <button class="rounded-lg p-2 text-muted hover:bg-error-surface hover:text-error" (click)="supprimerModule(m)" aria-label="Supprimer le module">
                          <app-icon name="trash" [size]="17" />
                        </button>
                      </div>
                    </li>
                  }
                </ol>
              } @else {
                <app-etat-vide icone="play-circle" titre="Aucun module" message="Ajoutez la première leçon vidéo de cette formation." />
              }
            </section>
          }
        </div>

        <!-- Suivi -->
        @if (fiche.hasValue()) {
          @let f = fiche.value()!;
          <aside class="flex flex-col gap-5">
            <section class="card overflow-hidden">
              @if (mediaUrl(f.miniatureUrl); as src) {
                <img [src]="src" alt="" class="aspect-video w-full object-cover" />
              }
              <div class="p-4 sm:p-5">
                <h2 class="card-title mb-3">Suivi des apprenants</h2>
                <dl class="grid grid-cols-2 gap-2.5 text-ms">
                  @for (
                    s of [
                      { l: 'Apprenants', v: nombre(f.apprenants) },
                      { l: 'Ont terminé', v: nombre(f.termines) },
                      { l: 'Complétion', v: f.tauxCompletion + ' %' },
                      { l: 'Durée totale', v: duree(f.dureeTotaleSecondes) },
                    ];
                    track s.l
                  ) {
                    <div class="rounded-xl bg-ochre-surface px-3 py-2.5">
                      <dt class="text-2xs text-muted-strong">{{ s.l }}</dt>
                      <dd class="font-bold">{{ s.v }}</dd>
                    </div>
                  }
                </dl>
                @if (f.auteur) {
                  <p class="mt-4 text-xs text-muted-strong">Mentor : <b class="text-brown">{{ f.auteur.nom }}</b></p>
                }
              </div>
            </section>
          </aside>
        }
      </div>
    } @else {
      <app-squelette [hauteur]="32" />
      <app-squelette class="mt-5" [hauteur]="420" />
    }

    @if (moduleEdite(); as m) {
      <app-module-formation
        [formationId]="fiche.value()!.id"
        [module]="m === 'nouveau' ? null : m"
        (fermer)="moduleEdite.set(null)"
        (enregistre)="fiche.value.set($event); moduleEdite.set(null)"
      />
    }
    @if (quizModule(); as m) {
      <app-editeur-quiz [moduleId]="m.id" [titreModule]="m.titre" (fermer)="quizModule.set(null)" (enregistre)="quizModule.set(null); fiche.reload()" />
    }
  `,
})
export class FormationFichePage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  protected readonly mediaUrl = mediaUrl;
  protected readonly nombre = nombre;
  protected readonly duree = duree;
  protected readonly niveaux = NIVEAUX;

  /** Paramètre de route : identifiant, ou absent pour une nouvelle formation. */
  readonly id = input<string>();
  protected readonly nouvelle = computed(() => !this.id());

  protected readonly fiche = httpResource<FormationDetailAdmin>(() =>
    this.id() ? `${API_ADMIN}/formations/${this.id()}` : undefined,
  );
  protected readonly categories = httpResource<CategorieAdmin[]>(
    () => ({ url: `${API_ADMIN}/categories`, params: { type: 'FORMATION' } }),
    { defaultValue: [] },
  );
  private readonly mentorsPage = httpResource<Page<UtilisateurAdmin>>(() => ({
    url: `${API_ADMIN}/utilisateurs`,
    params: { role: 'MENTOR', size: 200, sort: 'nom,asc' },
  }));
  protected readonly mentors = computed(() => (this.mentorsPage.hasValue() ? this.mentorsPage.value().content : []));
  protected readonly erreur = computed(() => messageApi(this.fiche.error()));
  protected readonly categoriesProposees = computed(() =>
    this.categories.value().filter((c) => c.active || c.nom === this.modele.categorie),
  );

  protected readonly enregistrement = signal(false);
  protected readonly reordonnancement = signal(false);
  protected readonly moduleEdite = signal<ModuleAdmin | 'nouveau' | null>(null);
  protected notification = notificationParDefaut();
  protected readonly quizModule = signal<ModuleAdmin | null>(null);
  protected modele = {
    titre: '',
    description: '',
    categorie: '',
    niveau: null as string | null,
    miniatureUrl: null as string | null,
    auteurId: null as number | null,
  };
  private formulaireInitialise = false;

  constructor() {
    // Remplit le formulaire au premier chargement de la fiche.
    effect(() => {
      if (!this.fiche.hasValue() || this.formulaireInitialise) return;
      const f = this.fiche.value();
      this.modele = {
        titre: f.titre,
        description: f.description ?? '',
        categorie: f.categorie,
        niveau: f.niveau,
        miniatureUrl: f.miniatureUrl,
        auteurId: null,
      };
      this.formulaireInitialise = true;
    });
  }

  protected enregistrer(): void {
    if (!this.modele.titre.trim() || !this.modele.categorie) {
      this.toast.erreur('Le titre et la catégorie sont obligatoires.');
      return;
    }
    const req = {
      titre: this.modele.titre.trim(),
      description: this.modele.description.trim() || null,
      categorie: this.modele.categorie,
      niveau: this.modele.niveau,
      miniatureUrl: this.modele.miniatureUrl,
      auteurId: this.modele.auteurId,
    };
    this.enregistrement.set(true);
    const id = this.fiche.value()?.id;
    (id ? this.api.modifierFormation(id, req, this.notification) : this.api.creerFormation(req)).subscribe({
      next: (f) => {
        this.enregistrement.set(false);
        if (id) {
          this.notification = notificationParDefaut();
          this.fiche.value.set(f);
          this.toast.succes('Formation enregistrée.');
        } else {
          this.toast.succes('Formation créée. Ajoutez maintenant ses modules.');
          void this.router.navigate(['/formations', f.id]);
        }
      },
      error: (e) => {
        this.enregistrement.set(false);
        this.toast.erreur(messageApi(e));
      },
    });
  }

  protected deplacer(index: number, sens: -1 | 1): void {
    const f = this.fiche.value()!;
    const ids = f.modules.map((m) => m.id);
    [ids[index], ids[index + sens]] = [ids[index + sens], ids[index]];
    this.reordonnancement.set(true);
    this.api.reordonnerModules(f.id, ids).subscribe({
      next: (maj) => {
        this.reordonnancement.set(false);
        this.fiche.value.set(maj);
      },
      error: (e) => {
        this.reordonnancement.set(false);
        this.toast.erreur(messageApi(e));
      },
    });
  }

  protected async supprimerModule(m: ModuleAdmin): Promise<void> {
    const { ok, notification } = await this.confirmation.demander({
      titre: `Supprimer le module « ${m.titre} » ?`,
      message: `La progression des apprenants sur ce module${m.quiz ? ' et les résultats de son quiz' : ''} seront supprimés.`,
      confirmer: 'Supprimer',
      danger: true,
      notification: this.fiche.value()?.auteur?.nom ?? 'le mentor',
    });
    if (!ok) return;
    this.api.supprimerModule(m.id, notification).subscribe({
      next: (f) => {
        this.fiche.value.set(f);
        this.toast.succes('Module supprimé.');
      },
      error: (e) => this.toast.erreur(messageApi(e)),
    });
  }

  protected async supprimer(): Promise<void> {
    const f = this.fiche.value()!;
    const { ok, notification } = await this.confirmation.demander({
      titre: `Supprimer « ${f.titre} » ?`,
      message: `La formation, ses ${f.modules.length} module(s) et la progression de ses ${f.apprenants} apprenant(s) seront supprimés définitivement.`,
      confirmer: 'Supprimer',
      danger: true,
      notification: f.auteur?.nom ?? 'le mentor',
    });
    if (!ok) return;
    this.api.supprimerFormation(f.id, notification).subscribe({
      next: () => {
        this.toast.succes(`« ${f.titre} » a été supprimée.`);
        void this.router.navigate(['/formations']);
      },
      error: (e) => this.toast.erreur(messageApi(e, 'Suppression impossible.')),
    });
  }
}
