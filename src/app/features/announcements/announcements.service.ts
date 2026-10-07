import type { AnnonceRequest, AnnonceAdmin } from './announcements.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';

/** Accès aux opérations de la fonctionnalité announcements. */
@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  private readonly http = inject(HttpClient);

  publierAnnonce(req: AnnonceRequest): Observable<AnnonceAdmin> {
    return this.http.post<AnnonceAdmin>(`${API_ADMIN}/annonces`, req);
  }

  retirerAnnonce(id: number): Observable<AnnonceAdmin> {
    return this.http.patch<AnnonceAdmin>(`${API_ADMIN}/annonces/${id}/retrait`, {});
  }
}
