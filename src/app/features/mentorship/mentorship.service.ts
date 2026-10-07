import type { CandidatureMentor } from './mentorship.model';
import type { OptionsNotification } from '../../core/models/common.model';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';
import { paramsNotification } from '../../core/api/api-params';

/** Accès aux opérations de la fonctionnalité mentorship. */
@Injectable({ providedIn: 'root' })
export class MentorshipService {
  private readonly http = inject(HttpClient);

  deciderCandidature(
    id: number,
    statut: 'ACCEPTE' | 'REFUSE',
    motifRefus?: string,
    notification?: OptionsNotification,
  ): Observable<CandidatureMentor> {
    return this.http.post<CandidatureMentor>(
      `${environment.apiUrl}/api/users/admin/candidatures-mentor/${id}/decision`,
      { statut, motifRefus: motifRefus || null },
      { params: paramsNotification(notification) },
    );
  }
}
