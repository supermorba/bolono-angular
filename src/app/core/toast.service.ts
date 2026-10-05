import { Injectable, signal } from '@angular/core';

export type TypeToast = 'succes' | 'erreur' | 'info';

export interface Toast {
  id: number;
  type: TypeToast;
  message: string;
}

/** Notifications éphémères (en bas à droite de l'écran). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private suivant = 0;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  succes(message: string): void {
    this.afficher('succes', message);
  }

  erreur(message: string): void {
    this.afficher('erreur', message, 6000);
  }

  info(message: string): void {
    this.afficher('info', message);
  }

  fermer(id: number): void {
    this._toasts.update((liste) => liste.filter((t) => t.id !== id));
  }

  private afficher(type: TypeToast, message: string, duree = 4000): void {
    const id = ++this.suivant;
    this._toasts.update((liste) => [...liste, { id, type, message }]);
    setTimeout(() => this.fermer(id), duree);
  }
}
