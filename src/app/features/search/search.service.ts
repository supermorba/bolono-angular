import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ResultatsRecherche } from './search.model';
import { API_ADMIN } from '../../core/api/api';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  rechercher(q: string): Observable<ResultatsRecherche> {
    return this.http.get<ResultatsRecherche>(`${API_ADMIN}/recherche`, { params: { q } });
  }
}
