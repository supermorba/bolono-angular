import type { TypeCategorie, CategorieAdmin, CleParametre, ParametreAdmin } from './settings.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';

/** Accès aux opérations de la fonctionnalité settings. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  enregistrerCategorie(
    id: number | null,
    req: { type: TypeCategorie; nom: string; icone: string | null; active: boolean },
  ): Observable<CategorieAdmin> {
    return id === null
      ? this.http.post<CategorieAdmin>(`${API_ADMIN}/categories`, req)
      : this.http.put<CategorieAdmin>(`${API_ADMIN}/categories/${id}`, req);
  }

  supprimerCategorie(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN}/categories/${id}`);
  }

  reordonnerCategories(type: TypeCategorie, ids: number[]): Observable<CategorieAdmin[]> {
    return this.http.put<CategorieAdmin[]>(
      `${API_ADMIN}/categories/ordre`,
      { ids },
      { params: { type } },
    );
  }

  enregistrerParametres(
    valeurs: Partial<Record<CleParametre, string | null>>,
  ): Observable<ParametreAdmin[]> {
    return this.http.put<ParametreAdmin[]>(`${API_ADMIN}/parametres`, { valeurs });
  }
}
