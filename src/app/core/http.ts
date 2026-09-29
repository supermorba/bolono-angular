import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

/**
 * Ajoute le jeton Firebase aux appels vers l'API Bolono et centralise les
 * erreurs d'authentification (401 : session expirée → reconnexion).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return from(auth.jeton()).pipe(
    switchMap((jeton) =>
      next(jeton ? req.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } }) : req),
    ),
    catchError((erreur: unknown) => {
      if (erreur instanceof HttpErrorResponse && erreur.status === 401 && auth.estAdmin()) {
        toast.erreur('Votre session a expiré. Veuillez vous reconnecter.');
        void auth.deconnexion().then(() => router.navigate(['/connexion']));
      }
      return throwError(() => erreur);
    }),
  );
};

/** Pages du back-office : réservées à un administrateur connecté. */
// inject() doit être appelé avant tout await : après, le contexte
// d'injection est perdu (erreur NG0203).
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.pret;
  return auth.estAdmin() ? true : router.createUrlTree(['/connexion']);
};

/** Page de connexion : inutile si déjà connecté. */
export const inviteGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.pret;
  return auth.estAdmin() ? router.createUrlTree(['/']) : true;
};

/** Message lisible pour une erreur d'appel à l'API. */
export function messageApi(erreur: unknown, defaut = 'Une erreur est survenue.'): string {
  if (erreur instanceof HttpErrorResponse) {
    if (erreur.status === 0) return "Le serveur Bolono est injoignable.";
    if (erreur.status === 403) return "Action non autorisée pour ce compte.";
    const message = (erreur.error as { message?: string } | null)?.message;
    if (message) return message;
  }
  return defaut;
}
