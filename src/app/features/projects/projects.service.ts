import type { StatutProjet, ProjetAdmin } from './projects.model';
import type { OptionsNotification } from '../../core/models/common.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';
import { paramsNotification } from '../../core/api/api-params';

/** Accès aux opérations de la fonctionnalité projects. */
@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);

  changerStatutProjet(
    id: number,
    statut: StatutProjet,
    notification?: OptionsNotification,
  ): Observable<ProjetAdmin> {
    return this.http.patch<ProjetAdmin>(
      `${API_ADMIN}/projets/${id}/statut`,
      { statut },
      { params: paramsNotification(notification) },
    );
  }

  supprimerProjet(id: number, notification?: OptionsNotification): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN}/projets/${id}`, {
      params: paramsNotification(notification),
    });
  }
}
