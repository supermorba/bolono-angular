import type { DecisionLitige, TransactionAdmin } from './payments.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_ADMIN } from '../../core/api/api';

/** Accès aux opérations de la fonctionnalité payments. */
@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);

  confirmerPaiement(
    reference: string,
    montantRecu: number,
    referenceOperation: string,
  ): Observable<void> {
    return this.http.post<void>(`${API_ADMIN}/paiements/${reference}/confirmer`, {
      montantRecu,
      referenceOperation,
    });
  }

  trancherLitige(
    reference: string,
    decision: DecisionLitige,
    commentaire: string,
  ): Observable<TransactionAdmin> {
    return this.http.post<TransactionAdmin>(`${API_ADMIN}/transactions/${reference}/trancher`, {
      decision,
      commentaire,
    });
  }

  marquerRembourse(reference: string, referenceOperation: string): Observable<TransactionAdmin> {
    return this.http.post<TransactionAdmin>(`${API_ADMIN}/transactions/${reference}/rembourse`, {
      referenceOperation,
    });
  }

  marquerVerse(reference: string, referenceOperation: string): Observable<TransactionAdmin> {
    return this.http.post<TransactionAdmin>(`${API_ADMIN}/transactions/${reference}/verse`, {
      referenceOperation,
    });
  }
}
