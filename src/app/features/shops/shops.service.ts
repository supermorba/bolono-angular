import type { BoutiqueAdminDetail } from './shops.model';
import type { OptionsNotification } from '../../core/models/common.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';
import { paramsNotification } from '../../core/api/api-params';

/** Accès aux opérations de la fonctionnalité shops. */
@Injectable({ providedIn: 'root' })
export class ShopsService {
  private readonly http = inject(HttpClient);

  changerVisibiliteBoutique(
    id: number,
    visible: boolean,
    motif?: string,
    notification?: OptionsNotification,
  ): Observable<BoutiqueAdminDetail> {
    return this.http.patch<BoutiqueAdminDetail>(
      `${API_ADMIN}/boutiques/${id}/visibilite`,
      { visible, motif: motif || null },
      { params: paramsNotification(notification) },
    );
  }
}
