import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CoursesService } from './courses.service';
import { messageApi } from '../../core/auth/http';
import type { BadgeAdmin } from '../badges/badges.model';
import type { QuestionQuiz, QuizAdmin, TypeQuestion } from './courses.model';
import { API_ADMIN } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Modale } from '../../shared/dialogs/fenetres';
import { Icon } from '../../shared/icons/icon';
import { ConfirmationService, Squelette } from '../../shared/components/ui';

const TYPES: { valeur: TypeQuestion; libelle: string }[] = [
  { valeur: 'CHOIX_UNIQUE', libelle: 'Une seule bonne réponse' },
  { valeur: 'CHOIX_MULTIPLE', libelle: 'Plusieurs bonnes réponses' },
  { valeur: 'VRAI_FAUX', libelle: 'Vrai ou faux' },
];

function questionVide(): QuestionQuiz {
  return {
    intitule: '',
    explication: null,
    points: 1,
    type: 'CHOIX_UNIQUE',
    reponses: [
      { texte: '', estCorrecte: true },
      { texte: '', estCorrecte: false },
    ],
  };
}

/**
 * Éditeur du quiz d'un module. Si des apprenants l'ont déjà passé, les
 * questions sont en lecture seule (leurs réponses y font référence) : seuls
 * les réglages restent modifiables.
 */
@Component({
  selector: 'app-editeur-quiz',
  imports: [FormsModule, Icon, Modale, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editeur-quiz.html',
})
export class EditeurQuiz {
  private readonly api = inject(CoursesService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly types = TYPES;

  readonly moduleId = input.required<number>();
  readonly titreModule = input('');
  readonly fermer = output<void>();
  readonly enregistre = output<void>();

  /** Quiz existant (204 → null : pas encore de quiz). */
  protected readonly quiz = httpResource<QuizAdmin | null>(
    () => `${API_ADMIN}/modules/${this.moduleId()}/quiz`,
  );
  protected readonly badges = httpResource<BadgeAdmin[]>(() => `${API_ADMIN}/badges`, {
    defaultValue: [],
  });

  protected readonly questions = signal<QuestionQuiz[]>([]);
  protected readonly modifiable = signal(true);
  protected readonly tentatives = signal(0);
  protected readonly quizExistant = signal(false);
  protected readonly enregistrement = signal(false);
  protected modele = {
    titre: '',
    description: '' as string | null,
    scoreMinimum: 80,
    dureeMinutes: null as number | null,
    nbTentativesMax: null as number | null,
    estObligatoire: true,
    badgeId: null as number | null,
  };

  constructor() {
    effect(() => {
      if (this.quiz.isLoading()) return;
      const q = this.quiz.hasValue() ? this.quiz.value() : null;
      if (q) {
        this.modele = {
          titre: q.titre,
          description: q.description,
          scoreMinimum: q.scoreMinimum,
          dureeMinutes: q.dureeMinutes,
          nbTentativesMax: q.nbTentativesMax,
          estObligatoire: q.estObligatoire,
          badgeId: q.badgeId,
        };
        this.questions.set(structuredClone(q.questions));
        this.modifiable.set(q.questionsModifiables);
        this.tentatives.set(q.tentatives);
        this.quizExistant.set(true);
      } else {
        this.modele.titre = `Quiz — ${this.titreModule()}`;
        this.questions.set([questionVide()]);
      }
    });
  }

  protected ajouterQuestion(): void {
    this.questions.update((liste) => [...liste, questionVide()]);
  }

  protected retirerQuestion(index: number): void {
    this.questions.update((liste) => liste.filter((_, i) => i !== index));
  }

  protected changerType(q: QuestionQuiz, type: TypeQuestion): void {
    q.type = type;
    if (type === 'VRAI_FAUX') {
      q.reponses = [
        { texte: 'Vrai', estCorrecte: true },
        { texte: 'Faux', estCorrecte: false },
      ];
    } else if (type === 'CHOIX_UNIQUE') {
      const premiere = Math.max(
        0,
        q.reponses.findIndex((r) => r.estCorrecte),
      );
      q.reponses.forEach((r, i) => (r.estCorrecte = i === premiere));
    }
    this.questions.update((liste) => [...liste]);
  }

  protected marquerCorrecte(q: QuestionQuiz, index: number, coche: boolean): void {
    if (q.type === 'CHOIX_MULTIPLE') {
      q.reponses[index].estCorrecte = coche;
    } else {
      q.reponses.forEach((r, i) => (r.estCorrecte = i === index));
    }
  }

  /** Vérifie le quiz avant envoi ; renvoie un message d'erreur ou null. */
  private verifier(): string | null {
    if (!this.modele.titre.trim()) return 'Le titre du quiz est obligatoire.';
    if (!this.modifiable()) return null;
    if (!this.questions().length) return 'Ajoutez au moins une question.';
    for (const [i, q] of this.questions().entries()) {
      const n = i + 1;
      if (!q.intitule.trim()) return `Question ${n} : l'intitulé est vide.`;
      if (q.reponses.some((r) => !r.texte.trim())) return `Question ${n} : une réponse est vide.`;
      if (!q.reponses.some((r) => r.estCorrecte))
        return `Question ${n} : indiquez la bonne réponse.`;
    }
    return null;
  }

  protected enregistrer(): void {
    const erreur = this.verifier();
    if (erreur) {
      this.toast.erreur(erreur);
      return;
    }
    this.enregistrement.set(true);
    this.api
      .enregistrerQuiz(this.moduleId(), {
        ...this.modele,
        titre: this.modele.titre.trim(),
        description: this.modele.description?.trim() || null,
        questions: this.questions().map((q) => ({
          ...q,
          intitule: q.intitule.trim(),
          explication: q.explication?.trim() || null,
          reponses: q.reponses.map((r) => ({ ...r, texte: r.texte.trim() })),
        })),
      })
      .subscribe({
        next: () => {
          this.enregistrement.set(false);
          this.toast.succes('Quiz enregistré.');
          this.enregistre.emit();
        },
        error: (e) => {
          this.enregistrement.set(false);
          this.toast.erreur(messageApi(e));
        },
      });
  }

  protected async supprimer(): Promise<void> {
    const { ok } = await this.confirmation.demander({
      titre: 'Supprimer ce quiz ?',
      message:
        'Les questions et les résultats des apprenants à ce quiz seront supprimés définitivement.',
      confirmer: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.enregistrement.set(true);
    this.api.supprimerQuiz(this.moduleId()).subscribe({
      next: () => {
        this.enregistrement.set(false);
        this.toast.succes('Quiz supprimé.');
        this.enregistre.emit();
      },
      error: (e) => {
        this.enregistrement.set(false);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
