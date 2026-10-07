import type { PublicationAdmin } from './publications.model';
import type { OptionsNotification } from '../../core/models/common.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';
import { paramsNotification } from '../../core/api/api-params';

/** Accès aux opérations de la fonctionnalité publications. */
@Injectable({ providedIn: 'root' })
export class PublicationsService {
  private readonly http = inject(HttpClient);

  changerStatutPublication(
    id: number,
    statut: 'PUBLIEE' | 'MASQUEE',
    notification?: OptionsNotification,
  ): Observable<PublicationAdmin> {
    return this.http.patch<PublicationAdmin>(
      `${API_ADMIN}/publications/${id}/statut`,
      { statut },
      { params: paramsNotification(notification) },
    );
  }

  supprimerPublication(id: number, notification?: OptionsNotification): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN}/publications/${id}`, {
      params: paramsNotification(notification),
    });
  }

  supprimerCommentaire(id: number, notification?: OptionsNotification): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN}/commentaires/${id}`, {
      params: paramsNotification(notification),
    });
  }
}
