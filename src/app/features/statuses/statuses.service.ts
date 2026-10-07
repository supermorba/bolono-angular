import type { OptionsNotification } from '../../core/models/common.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';
import { paramsNotification } from '../../core/api/api-params';

/** Accès aux opérations de la fonctionnalité statuses. */
@Injectable({ providedIn: 'root' })
export class StatusesService {
  private readonly http = inject(HttpClient);

  supprimerStatut(id: number, notification?: OptionsNotification): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN}/statuts/${id}`, {
      params: paramsNotification(notification),
    });
  }
}
