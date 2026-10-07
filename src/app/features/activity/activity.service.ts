import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN, sansVides } from '../../core/api/ressources';
import type { PageActivites, TypeActivite } from './activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);

  charger(type: TypeActivite | '', page: number, taille = 25): Observable<PageActivites> {
    return this.http.get<PageActivites>(`${API_ADMIN}/activites`, {
      params: sansVides({ type, page, size: taille }),
    });
  }
}
