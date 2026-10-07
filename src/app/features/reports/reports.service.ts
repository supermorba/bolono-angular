import type { StatutPublication } from '../publications/publications.model';
import type { SignalementAdmin } from './reports.model';
import type { OptionsNotification } from '../../core/models/common.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';
import { paramsNotification } from '../../core/api/api-params';

/** Accès aux opérations de la fonctionnalité reports. */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);

  moderer(
    publicationId: number,
    statut: Extract<StatutPublication, 'PUBLIEE' | 'MASQUEE'>,
    notification?: OptionsNotification,
  ): Observable<SignalementAdmin> {
    return this.http.patch<SignalementAdmin>(
      `${API_ADMIN}/signalements/${publicationId}`,
      { statut },
      { params: paramsNotification(notification) },
    );
  }
}
