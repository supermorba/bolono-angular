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
import { Router, RouterLink } from '@angular/router';
import { CoursesService } from './courses.service';
import { mediaUrl, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { CategorieAdmin } from '../settings/settings.model';
import type { FormationDetailAdmin, ModuleAdmin } from './courses.model';
import type { Page } from '../../core/models/common.model';
import type { UtilisateurAdmin } from '../users/users.model';
import { API_ADMIN } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Modale, Televersement } from '../../shared/dialogs/fenetres';
import { OptionNotification, notificationParDefaut } from '../../shared/components/option-notification';
import { Icon } from '../../shared/icons/icon';
import { Badge, ConfirmationService, EtatVide, Squelette, EntetePage } from '../../shared/components/ui';
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
  templateUrl: './module-formation.html',
})
export class ModuleFormation {
  private readonly api = inject(CoursesService);
  private readonly toast = inject(ToastService);

  readonly formationId = input.required<number>();
  readonly module = input<ModuleAdmin | null>(null);
  readonly fermer = output<void>();
  readonly enregistre = output<FormationDetailAdmin>();

  protected readonly enregistrement = signal(false);
  protected modele = {
    titre: '',
    description: '',
    urlVideo: '',
    dureeSecondes: 0,
    disponibleHorsLigne: false,
  };
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
    (m
      ? this.api.modifierModule(m.id, req)
      : this.api.ajouterModule(this.formationId(), req)
    ).subscribe({
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
  imports: [
    EntetePage,
    FormsModule,
    RouterLink,
    Icon,
    Badge,
    EtatVide,
    Squelette,
    Televersement,
    ModuleFormation,
    EditeurQuiz,
    OptionNotification,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formation-fiche.html',
})
export class FormationFichePage {
  private readonly api = inject(CoursesService);
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
  protected readonly mentors = computed(() =>
    this.mentorsPage.hasValue() ? this.mentorsPage.value().content : [],
  );
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
    (id
      ? this.api.modifierFormation(id, req, this.notification)
      : this.api.creerFormation(req)
    ).subscribe({
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
