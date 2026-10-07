import type { ProduitAdmin, TypeProduit } from './products.model';
import type { OptionsNotification } from '../../core/models/common.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';
import { paramsNotification } from '../../core/api/api-params';

/** Accès aux opérations de la fonctionnalité products. */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  changerVisibiliteProduit(
    id: number,
    visible: boolean,
    notification?: OptionsNotification,
  ): Observable<ProduitAdmin> {
    return this.http.patch<ProduitAdmin>(
      `${API_ADMIN}/produits/${id}/visibilite`,
      { visible },
      { params: paramsNotification(notification) },
    );
  }

  modifierProduit(
    id: number,
    req: {
      nom: string;
      description: string | null;
      prixFCFA: number;
      prixEUR: number | null;
      stock: number | null;
      uniteMesure: string | null;
      typeProduit: TypeProduit;
      categorie: string | null;
      images: string[];
    },
    notification?: OptionsNotification,
  ): Observable<ProduitAdmin> {
    return this.http.put<ProduitAdmin>(`${API_ADMIN}/produits/${id}`, req, {
      params: paramsNotification(notification),
    });
  }
}
