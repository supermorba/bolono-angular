import type { UtilisateurDetail, SuspensionResultat } from './users.model';
import type { OptionsNotification } from '../../core/models/common.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';
import { paramsNotification, parametres } from '../../core/api/api-params';

/** Accès aux opérations de la fonctionnalité users. */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  supprimerUtilisateur(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN}/utilisateurs/${id}`);
  }

  definirAccesAdmin(
    id: number,
    admin: boolean,
    notification?: OptionsNotification,
  ): Observable<UtilisateurDetail> {
    return this.http.patch<UtilisateurDetail>(
      `${API_ADMIN}/utilisateurs/${id}/admin`,
      { admin },
      { params: paramsNotification(notification) },
    );
  }

  definirMentor(
    id: number,
    mentor: boolean,
    notification?: OptionsNotification,
  ): Observable<UtilisateurDetail> {
    return this.http.patch<UtilisateurDetail>(
      `${API_ADMIN}/utilisateurs/${id}/mentor`,
      { mentor },
      { params: paramsNotification(notification) },
    );
  }

  definirSuspension(
    id: number,
    suspendu: boolean,
    motif?: string,
    notification?: OptionsNotification,
  ): Observable<SuspensionResultat> {
    return this.http.patch<SuspensionResultat>(
      `${API_ADMIN}/utilisateurs/${id}/suspension`,
      {
        suspendu,
        motif: motif || null,
      },
      { params: paramsNotification(notification) },
    );
  }

  exporterUtilisateurs(filtres: { q?: string; role?: string; statut?: string }): Observable<Blob> {
    return this.http.get(`${API_ADMIN}/utilisateurs/export`, {
      params: parametres(filtres),
      responseType: 'blob',
    });
  }
}
