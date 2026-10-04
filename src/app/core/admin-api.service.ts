import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { HttpEvent } from '@angular/common/http';
import type {
  AnnonceAdmin,
  AnnonceRequest,
  BadgeAdmin,
  CandidatureMentor,
  CategorieAdmin,
  CategorieFichier,
  CleParametre,
  CommentaireAdmin,
  FormationDetailAdmin,
  FormationRequest,
  ModuleRequest,
  ParametreAdmin,
  ProjetAdmin,
  PublicationAdmin,
  QuestionQuiz,
  QuizAdmin,
  StatutProjet,
  TypeCategorie,
  TypeProduit,
  CommandeAdmin,
  DecisionLitige,
  Notifications,
  TransactionAdmin,
  OptionsNotification,
  ProduitAdmin,
  ResultatsRecherche,
  SignalementAdmin,
  StatutPublication,
  SuspensionResultat,
  UtilisateurDetail,
} from './models';

/**
 * Actions de l'API d'administration (écritures, recherche, export).
 * Les lectures des pages passent par httpResource (cf. core/ressources.ts),
 * qui les relance automatiquement quand les filtres changent.
 */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/admin`;


  notifications(): Observable<Notifications> {
    return this.http.get<Notifications>(`${this.base}/notifications`);
  }

  rechercher(q: string): Observable<ResultatsRecherche> {
    return this.http.get<ResultatsRecherche>(`${this.base}/recherche`, { params: { q } });
  }

  // ── Utilisateurs ──────────────────────────────────────────────────────────


  supprimerUtilisateur(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/utilisateurs/${id}`);
  }

  definirAccesAdmin(id: number, admin: boolean, notification?: OptionsNotification): Observable<UtilisateurDetail> {
    return this.http.patch<UtilisateurDetail>(`${this.base}/utilisateurs/${id}/admin`, { admin }, { params: paramsNotification(notification) });
  }

  definirMentor(id: number, mentor: boolean, notification?: OptionsNotification): Observable<UtilisateurDetail> {
    return this.http.patch<UtilisateurDetail>(`${this.base}/utilisateurs/${id}/mentor`, { mentor }, { params: paramsNotification(notification) });
  }

  definirSuspension(id: number, suspendu: boolean, motif?: string, notification?: OptionsNotification): Observable<SuspensionResultat> {
    return this.http.patch<SuspensionResultat>(`${this.base}/utilisateurs/${id}/suspension`, {
      suspendu,
      motif: motif || null,
    }, { params: paramsNotification(notification) });
  }

  /** Export CSV des utilisateurs correspondant aux filtres. */
  exporterUtilisateurs(filtres: { q?: string; role?: string; statut?: string }): Observable<Blob> {
    return this.http.get(`${this.base}/utilisateurs/export`, { params: parametres(filtres), responseType: 'blob' });
  }

  // ── Produits ──────────────────────────────────────────────────────────────


  validerProduit(id: number, valide: boolean, notification?: OptionsNotification): Observable<ProduitAdmin> {
    return this.http.patch<ProduitAdmin>(`${this.base}/produits/${id}/validation`, { valide }, { params: paramsNotification(notification) });
  }

  // ── Formations ────────────────────────────────────────────────────────────


  supprimerFormation(id: number, notification?: OptionsNotification): Observable<void> {
    return this.http.delete<void>(`${this.base}/formations/${id}`, { params: paramsNotification(notification) });
  }

  // ── Mentorat (UserController) ─────────────────────────────────────────────


  deciderCandidature(id: number, statut: 'ACCEPTE' | 'REFUSE', motifRefus?: string, notification?: OptionsNotification): Observable<CandidatureMentor> {
    return this.http.post<CandidatureMentor>(
      `${environment.apiUrl}/api/users/admin/candidatures-mentor/${id}/decision`,
      { statut, motifRefus: motifRefus || null }, { params: paramsNotification(notification) });
  }

  // ── Commandes ─────────────────────────────────────────────────────────────


  // Les vendeurs gèrent leurs commandes : l'équipe n'en change plus le statut.
  // Elle intervient sur les transactions sécurisées (une par vendeur) :
  // paiements reçus, litiges, remboursements et versements, chaque fois avec
  // la référence de l'opération.

  confirmerPaiement(reference: string, montantRecu: number, referenceOperation: string): Observable<void> {
    return this.http.post<void>(`${this.base}/paiements/${reference}/confirmer`, { montantRecu, referenceOperation });
  }

  trancherLitige(reference: string, decision: DecisionLitige, commentaire: string): Observable<TransactionAdmin> {
    return this.http.post<TransactionAdmin>(`${this.base}/transactions/${reference}/trancher`, { decision, commentaire });
  }

  marquerRembourse(reference: string, referenceOperation: string): Observable<TransactionAdmin> {
    return this.http.post<TransactionAdmin>(`${this.base}/transactions/${reference}/rembourse`, { referenceOperation });
  }

  marquerVerse(reference: string, referenceOperation: string): Observable<TransactionAdmin> {
    return this.http.post<TransactionAdmin>(`${this.base}/transactions/${reference}/verse`, { referenceOperation });
  }

  // ── Signalements ──────────────────────────────────────────────────────────


  moderer(publicationId: number, statut: Extract<StatutPublication, 'PUBLIEE' | 'MASQUEE'>, notification?: OptionsNotification): Observable<SignalementAdmin> {
    return this.http.patch<SignalementAdmin>(`${this.base}/signalements/${publicationId}`, { statut }, { params: paramsNotification(notification) });
  }

  // ── Formations, modules, quiz, badges ─────────────────────────────────────

  creerFormation(req: FormationRequest): Observable<FormationDetailAdmin> {
    return this.http.post<FormationDetailAdmin>(`${this.base}/formations`, req);
  }

  modifierFormation(id: number, req: FormationRequest, notification?: OptionsNotification): Observable<FormationDetailAdmin> {
    return this.http.put<FormationDetailAdmin>(`${this.base}/formations/${id}`, req, { params: paramsNotification(notification) });
  }

  ajouterModule(formationId: number, req: ModuleRequest): Observable<FormationDetailAdmin> {
    return this.http.post<FormationDetailAdmin>(`${this.base}/formations/${formationId}/modules`, req);
  }

  modifierModule(moduleId: number, req: ModuleRequest): Observable<FormationDetailAdmin> {
    return this.http.put<FormationDetailAdmin>(`${this.base}/modules/${moduleId}`, req);
  }

  supprimerModule(moduleId: number, notification?: OptionsNotification): Observable<FormationDetailAdmin> {
    return this.http.delete<FormationDetailAdmin>(`${this.base}/modules/${moduleId}`, { params: paramsNotification(notification) });
  }

  reordonnerModules(formationId: number, ids: number[]): Observable<FormationDetailAdmin> {
    return this.http.put<FormationDetailAdmin>(`${this.base}/formations/${formationId}/modules/ordre`, { ids });
  }

  enregistrerQuiz(
    moduleId: number,
    quiz: Omit<QuizAdmin, 'id' | 'tentatives' | 'questionsModifiables' | 'questions'> & { questions: QuestionQuiz[] },
  ): Observable<QuizAdmin> {
    // Format attendu par le backend (CreateQuizRequest).
    return this.http.put<QuizAdmin>(`${this.base}/modules/${moduleId}/quiz`, {
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
        reponses: q.reponses.map((r) => ({ texte: r.texte, estCorrecte: r.estCorrecte, explicationReponse: r.explication ?? null })),
      })),
    });
  }

  supprimerQuiz(moduleId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/modules/${moduleId}/quiz`);
  }

  enregistrerBadge(
    id: number | null,
    req: { intitule: string; description: string | null; urlIcone: string | null; categorie: string | null },
  ): Observable<BadgeAdmin> {
    return id === null
      ? this.http.post<BadgeAdmin>(`${this.base}/badges`, req)
      : this.http.put<BadgeAdmin>(`${this.base}/badges/${id}`, req);
  }

  supprimerBadge(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/badges/${id}`);
  }

  // ── Produits ──────────────────────────────────────────────────────────────

  modifierProduit(
    id: number,
    req: {
      nom: string;
      description: string | null;
      prixFCFA: number;
      prixEUR: number | null;
      stock: number | null;
      uniteMesure: string | null;
      typeProduit: TypeProduit;
      categorie: string | null;
      images: string[];
    },
    notification?: OptionsNotification,
  ): Observable<ProduitAdmin> {
    return this.http.put<ProduitAdmin>(`${this.base}/produits/${id}`, req, { params: paramsNotification(notification) });
  }

  // ── Commandes ─────────────────────────────────────────────────────────────

  exporterCommandes(filtres: { statut?: string; q?: string; du?: string; au?: string }): Observable<Blob> {
    return this.http.get(`${this.base}/commandes/export`, { params: parametres(filtres), responseType: 'blob' });
  }

  exporterRapport(du: string, au: string): Observable<Blob> {
    return this.http.get(`${this.base}/rapport`, { params: { du, au }, responseType: 'blob' });
  }

  // ── Communauté ────────────────────────────────────────────────────────────

  changerStatutPublication(id: number, statut: 'PUBLIEE' | 'MASQUEE', notification?: OptionsNotification): Observable<PublicationAdmin> {
    return this.http.patch<PublicationAdmin>(`${this.base}/publications/${id}/statut`, { statut }, { params: paramsNotification(notification) });
  }

  supprimerPublication(id: number, notification?: OptionsNotification): Observable<void> {
    return this.http.delete<void>(`${this.base}/publications/${id}`, { params: paramsNotification(notification) });
  }

  supprimerCommentaire(id: number, notification?: OptionsNotification): Observable<void> {
    return this.http.delete<void>(`${this.base}/commentaires/${id}`, { params: paramsNotification(notification) });
  }

  supprimerStatut(id: number, notification?: OptionsNotification): Observable<void> {
    return this.http.delete<void>(`${this.base}/statuts/${id}`, { params: paramsNotification(notification) });
  }

  changerStatutProjet(id: number, statut: StatutProjet, notification?: OptionsNotification): Observable<ProjetAdmin> {
    return this.http.patch<ProjetAdmin>(`${this.base}/projets/${id}/statut`, { statut }, { params: paramsNotification(notification) });
  }

  supprimerProjet(id: number, notification?: OptionsNotification): Observable<void> {
    return this.http.delete<void>(`${this.base}/projets/${id}`, { params: paramsNotification(notification) });
  }

  // ── Annonces ──────────────────────────────────────────────────────────────

  publierAnnonce(req: AnnonceRequest): Observable<AnnonceAdmin> {
    return this.http.post<AnnonceAdmin>(`${this.base}/annonces`, req);
  }

  retirerAnnonce(id: number): Observable<AnnonceAdmin> {
    return this.http.patch<AnnonceAdmin>(`${this.base}/annonces/${id}/retrait`, {});
  }

  // ── Plateforme ────────────────────────────────────────────────────────────

  enregistrerCategorie(
    id: number | null,
    req: { type: TypeCategorie; nom: string; icone: string | null; active: boolean },
  ): Observable<CategorieAdmin> {
    return id === null
      ? this.http.post<CategorieAdmin>(`${this.base}/categories`, req)
      : this.http.put<CategorieAdmin>(`${this.base}/categories/${id}`, req);
  }

  supprimerCategorie(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  reordonnerCategories(type: TypeCategorie, ids: number[]): Observable<CategorieAdmin[]> {
    return this.http.put<CategorieAdmin[]>(`${this.base}/categories/ordre`, { ids }, { params: { type } });
  }

  enregistrerParametres(valeurs: Partial<Record<CleParametre, string | null>>): Observable<ParametreAdmin[]> {
    return this.http.put<ParametreAdmin[]>(`${this.base}/parametres`, { valeurs });
  }

  /** Téléverse un fichier ; les événements donnent la progression de l'envoi. */
  televerser(categorie: CategorieFichier, fichier: File): Observable<HttpEvent<{ url: string }>> {
    const donnees = new FormData();
    donnees.append('fichier', fichier);
    return this.http.post<{ url: string }>(`${this.base}/uploads`, donnees, {
      params: { categorie },
      reportProgress: true,
      observe: 'events',
    });
  }
}

/** ?notifier=false quand l'administrateur a décoché l'option, &motif=… s'il a précisé. */
function paramsNotification(options: OptionsNotification | undefined): HttpParams {
  return parametres({ notifier: options && !options.notifier ? 'false' : null, motif: options?.notifier ? options.motif : null });
}

/** Paramètres de requête, sans les valeurs vides. */
function parametres(valeurs: Record<string, string | number | undefined | null>): HttpParams {
  let params = new HttpParams();
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if (valeur !== undefined && valeur !== null && valeur !== '') {
      params = params.set(cle, String(valeur));
    }
  }
  return params;
}
