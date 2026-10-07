import type { BadgeAdmin } from './badges.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';

/** Accès aux opérations de la fonctionnalité badges. */
@Injectable({ providedIn: 'root' })
export class BadgesService {
  private readonly http = inject(HttpClient);

  enregistrerBadge(
    id: number | null,
    req: {
      intitule: string;
      description: string | null;
      urlIcone: string | null;
      categorie: string | null;
    },
  ): Observable<BadgeAdmin> {
    return id === null
      ? this.http.post<BadgeAdmin>(`${API_ADMIN}/badges`, req)
      : this.http.put<BadgeAdmin>(`${API_ADMIN}/badges/${id}`, req);
  }

  supprimerBadge(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN}/badges/${id}`);
  }
}
