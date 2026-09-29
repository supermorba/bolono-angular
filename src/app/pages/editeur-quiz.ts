import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../core/admin-api.service';
import { messageApi } from '../core/http';
import type { BadgeAdmin, QuestionQuiz, QuizAdmin, TypeQuestion } from '../core/models';
import { API_ADMIN } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Modale } from '../shared/fenetres';
import { Icon } from '../shared/icon';
import { ConfirmationService, Squelette } from '../shared/ui';

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
  template: `
    <app-modale [titre]="'Quiz — ' + titreModule()" largeur="max-w-3xl" (fermer)="fermer.emit()">
      @if (quiz.isLoading()) {
        <app-squelette [hauteur]="40" />
        <app-squelette class="mt-3" [hauteur]="160" />
      } @else {
        <form id="form-quiz" class="space-y-5" (submit)="$event.preventDefault(); enregistrer()">
          <!-- Réglages -->
          <section class="grid gap-3 sm:grid-cols-2">
            <label class="block text-xs font-semibold text-muted-strong sm:col-span-2">
              Titre du quiz
              <input class="input mt-1" name="titre" [(ngModel)]="modele.titre" required maxlength="200" />
            </label>
            <label class="block text-xs font-semibold text-muted-strong sm:col-span-2">
              Consigne (facultative)
              <textarea class="input mt-1 min-h-16" name="description" [(ngModel)]="modele.description"></textarea>
            </label>
            <label class="block text-xs font-semibold text-muted-strong">
              Score pour réussir (%)
              <input type="number" min="0" max="100" class="input mt-1" name="score" [(ngModel)]="modele.scoreMinimum" />
            </label>
            <label class="block text-xs font-semibold text-muted-strong">
              Durée (minutes, facultative)
              <input type="number" min="1" class="input mt-1" name="duree" [(ngModel)]="modele.dureeMinutes" />
            </label>
            <label class="block text-xs font-semibold text-muted-strong">
              Tentatives maximum (vide : illimité)
              <input type="number" min="1" class="input mt-1" name="tentatives" [(ngModel)]="modele.nbTentativesMax" />
            </label>
            <label class="block text-xs font-semibold text-muted-strong">
              Badge décerné en cas de réussite
              <select class="input mt-1" name="badge" [(ngModel)]="modele.badgeId">
                <option [ngValue]="null">Aucun badge</option>
                @for (b of badges.value(); track b.id) {
                  <option [ngValue]="b.id">{{ b.intitule }}</option>
                }
              </select>
            </label>
            <label class="flex items-center gap-2 text-ms sm:col-span-2">
              <input type="checkbox" class="h-4 w-4 accent-terracotta" name="obligatoire" [(ngModel)]="modele.estObligatoire" />
              Réussite obligatoire pour valider le module
            </label>
          </section>

          <!-- Questions -->
          <section>
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-ms font-bold">Questions ({{ questions().length }})</h3>
              @if (modifiable()) {
                <button type="button" class="btn-outline btn-sm" (click)="ajouterQuestion()"><app-icon name="user-plus" [size]="14" /> Ajouter une question</button>
              }
            </div>
            @if (!modifiable()) {
              <p class="mb-3 rounded-xl bg-warning-surface px-3.5 py-2.5 text-xs text-warning">
                {{ tentatives() }} tentative{{ tentatives() > 1 ? 's' : '' }} déjà enregistrée{{ tentatives() > 1 ? 's' : '' }} :
                les questions ne peuvent plus être modifiées. Seuls les réglages ci-dessus seront enregistrés.
              </p>
            }
            <ol class="space-y-3">
              @for (q of questions(); track $index; let qi = $index) {
                <li class="rounded-xl border border-line bg-ivory p-3.5">
                  <div class="flex items-start gap-2">
                    <span class="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brown text-2xs font-bold text-white">{{ qi + 1 }}</span>
                    <div class="min-w-0 flex-1 space-y-2">
                      <input class="input py-2!" [name]="'q' + qi" placeholder="Intitulé de la question" [(ngModel)]="q.intitule" [disabled]="!modifiable()" required />
                      <div class="flex flex-wrap gap-2">
                        <select class="input w-auto! py-1.5! text-xs!" [name]="'t' + qi" [ngModel]="q.type" (ngModelChange)="changerType(q, $event)" [disabled]="!modifiable()">
                          @for (t of types; track t.valeur) {
                            <option [ngValue]="t.valeur">{{ t.libelle }}</option>
                          }
                        </select>
                        <label class="flex items-center gap-1.5 text-xs text-muted-strong">
                          Points
                          <input type="number" min="1" class="input w-16! py-1.5! text-xs!" [name]="'p' + qi" [(ngModel)]="q.points" [disabled]="!modifiable()" />
                        </label>
                      </div>
                      <ul class="space-y-1.5">
                        @for (r of q.reponses; track $index; let ri = $index) {
                          <li class="flex items-center gap-2">
                            <input
                              [type]="q.type === 'CHOIX_MULTIPLE' ? 'checkbox' : 'radio'"
                              class="h-4 w-4 shrink-0 accent-success"
                              [name]="'c' + qi + (q.type === 'CHOIX_MULTIPLE' ? '-' + ri : '')"
                              [checked]="r.estCorrecte"
                              (change)="marquerCorrecte(q, ri, $any($event.target).checked)"
                              [disabled]="!modifiable()"
                              [attr.aria-label]="'Bonne réponse ' + (ri + 1)"
                            />
                            <input
                              class="input py-1.5! text-ms!"
                              [name]="'r' + qi + '-' + ri"
                              [placeholder]="'Réponse ' + (ri + 1)"
                              [(ngModel)]="r.texte"
                              [disabled]="!modifiable() || q.type === 'VRAI_FAUX'"
                              required
                            />
                            @if (modifiable() && q.type !== 'VRAI_FAUX' && q.reponses.length > 2) {
                              <button type="button" class="text-muted hover:text-error" (click)="q.reponses.splice(ri, 1)" aria-label="Retirer la réponse">
                                <app-icon name="x" [size]="15" />
                              </button>
                            }
                          </li>
                        }
                      </ul>
                      @if (modifiable() && q.type !== 'VRAI_FAUX') {
                        <button type="button" class="link-accent" (click)="q.reponses.push({ texte: '', estCorrecte: false })">+ Ajouter une réponse</button>
                      }
                      <input class="input py-1.5! text-xs!" [name]="'e' + qi" placeholder="Explication affichée après la réponse (facultative)" [(ngModel)]="q.explication" [disabled]="!modifiable()" />
                    </div>
                    @if (modifiable()) {
                      <button type="button" class="mt-2 rounded-lg p-1.5 text-muted hover:bg-error-surface hover:text-error" (click)="retirerQuestion(qi)" aria-label="Supprimer la question">
                        <app-icon name="trash" [size]="16" />
                      </button>
                    }
                  </div>
                </li>
              } @empty {
                <li class="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Aucune question pour l'instant.</li>
              }
            </ol>
          </section>
        </form>
      }

      <ng-container pied>
        @if (quizExistant()) {
          <button class="btn-sm mr-auto text-xs font-semibold text-error hover:underline" [disabled]="enregistrement()" (click)="supprimer()">Supprimer le quiz</button>
        }
        <button class="btn-outline" (click)="fermer.emit()">Annuler</button>
        <button class="btn-accent" type="submit" form="form-quiz" [disabled]="enregistrement() || quiz.isLoading()">
          @if (enregistrement()) {
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
          }
          Enregistrer le quiz
        </button>
      </ng-container>
    </app-modale>
  `,
})
export class EditeurQuiz {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly types = TYPES;

  readonly moduleId = input.required<number>();
  readonly titreModule = input('');
  readonly fermer = output<void>();
  readonly enregistre = output<void>();

  /** Quiz existant (204 → null : pas encore de quiz). */
  protected readonly quiz = httpResource<QuizAdmin | null>(() => `${API_ADMIN}/modules/${this.moduleId()}/quiz`);
  protected readonly badges = httpResource<BadgeAdmin[]>(() => `${API_ADMIN}/badges`, { defaultValue: [] });

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
      const premiere = Math.max(0, q.reponses.findIndex((r) => r.estCorrecte));
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
      if (!q.reponses.some((r) => r.estCorrecte)) return `Question ${n} : indiquez la bonne réponse.`;
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
      message: 'Les questions et les résultats des apprenants à ce quiz seront supprimés définitivement.',
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
