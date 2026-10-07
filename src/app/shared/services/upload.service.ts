import { HttpClient, type HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CategorieFichier } from '../models/upload.model';
import { API_ADMIN } from '../../core/api/api';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  /** Téléverse un fichier et expose la progression de l’envoi. */
  televerser(categorie: CategorieFichier, fichier: File): Observable<HttpEvent<{ url: string }>> {
    const donnees = new FormData();
    donnees.append('fichier', fichier);
    return this.http.post<{ url: string }>(`${API_ADMIN}/uploads`, donnees, {
      params: { categorie },
      reportProgress: true,
      observe: 'events',
    });
  }
}
