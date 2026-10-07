import { HttpParams } from '@angular/common/http';
import type { OptionsNotification } from '../models/common.model';

/** Paramètres de requête, sans les valeurs vides. */
export function parametres(
  valeurs: Record<string, string | number | undefined | null>,
): HttpParams {
  let params = new HttpParams();
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if (valeur !== undefined && valeur !== null && valeur !== '') {
      params = params.set(cle, String(valeur));
    }
  }
  return params;
}

/** Ajoute le motif de notification, ou désactive explicitement la notification. */
export function paramsNotification(options: OptionsNotification | undefined): HttpParams {
  return parametres({
    notifier: options && !options.notifier ? 'false' : null,
    motif: options?.notifier ? options.motif : null,
  });
}
