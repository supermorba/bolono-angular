import type { FormationRequest, FormationDetailAdmin, ModuleRequest, QuizAdmin, QuestionQuiz } from './courses.model';
import type { OptionsNotification } from '../../core/models/common.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';
import { paramsNotification } from '../../core/api/api-params';

/** Accès aux opérations de la fonctionnalité courses. */
@Injectable({ providedIn: 'root' })
export class CoursesService {
  private readonly http = inject(HttpClient);

  supprimerFormation(id: number, notification?: OptionsNotification): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN}/formations/${id}`, {
      params: paramsNotification(notification),
    });
  }

  creerFormation(req: FormationRequest): Observable<FormationDetailAdmin> {
    return this.http.post<FormationDetailAdmin>(`${API_ADMIN}/formations`, req);
  }

  modifierFormation(
    id: number,
    req: FormationRequest,
    notification?: OptionsNotification,
  ): Observable<FormationDetailAdmin> {
    return this.http.put<FormationDetailAdmin>(`${API_ADMIN}/formations/${id}`, req, {
      params: paramsNotification(notification),
    });
  }

  ajouterModule(formationId: number, req: ModuleRequest): Observable<FormationDetailAdmin> {
    return this.http.post<FormationDetailAdmin>(
      `${API_ADMIN}/formations/${formationId}/modules`,
      req,
    );
  }

  modifierModule(moduleId: number, req: ModuleRequest): Observable<FormationDetailAdmin> {
    return this.http.put<FormationDetailAdmin>(`${API_ADMIN}/modules/${moduleId}`, req);
  }

  supprimerModule(
    moduleId: number,
    notification?: OptionsNotification,
  ): Observable<FormationDetailAdmin> {
    return this.http.delete<FormationDetailAdmin>(`${API_ADMIN}/modules/${moduleId}`, {
      params: paramsNotification(notification),
    });
  }

  reordonnerModules(formationId: number, ids: number[]): Observable<FormationDetailAdmin> {
    return this.http.put<FormationDetailAdmin>(
      `${API_ADMIN}/formations/${formationId}/modules/ordre`,
      { ids },
    );
  }

  enregistrerQuiz(
    moduleId: number,
    quiz: Omit<QuizAdmin, 'id' | 'tentatives' | 'questionsModifiables' | 'questions'> & {
      questions: QuestionQuiz[];
    },
  ): Observable<QuizAdmin> {
    // Format attendu par le backend (CreateQuizRequest).
    return this.http.put<QuizAdmin>(`${API_ADMIN}/modules/${moduleId}/quiz`, {
      titre: quiz.titre,
      description: quiz.description,
      scoreMinimum: quiz.scoreMinimum,
      dureeMinutes: quiz.dureeMinutes,
      nbTentativesMax: quiz.nbTentativesMax,
      estObligatoire: quiz.estObligatoire,
      badgeId: quiz.badgeId,
      questions: quiz.questions.map((q, i) => ({
        intitule: q.intitule,
        explication: q.explication,
        points: q.points,
        ordre: i + 1,
        typeQuestion: q.type,
        reponses: q.reponses.map((r) => ({
          texte: r.texte,
          estCorrecte: r.estCorrecte,
          explicationReponse: r.explication ?? null,
        })),
      })),
    });
  }

  supprimerQuiz(moduleId: number): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN}/modules/${moduleId}/quiz`);
  }
}
