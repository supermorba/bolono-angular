import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';
import { parametres } from '../../core/api/api-params';

/** Accès aux opérations de la fonctionnalité orders. */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);

  exporterCommandes(filtres: {
    statut?: string;
    q?: string;
    du?: string;
    au?: string;
  }): Observable<Blob> {
    return this.http.get(`${API_ADMIN}/commandes/export`, {
      params: parametres(filtres),
      responseType: 'blob',
    });
  }
}
