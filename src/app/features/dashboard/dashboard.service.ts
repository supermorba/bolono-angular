import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';

/** Accès aux opérations de la fonctionnalité dashboard. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  exporterRapport(du: string, au: string): Observable<Blob> {
    return this.http.get(`${API_ADMIN}/rapport`, { params: { du, au }, responseType: 'blob' });
  }
}
