import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { Observable } from 'rxjs';
import { RouterLink } from '@angular/router';
import { UsersService } from './users.service';
import { LIBELLES_ROLE } from './users.labels';
import { AuthService } from '../../core/auth/auth.service';
import { dateHeure, fcfa, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { UtilisateurDetail } from './users.model';
import { API_ADMIN } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';
import { Avatar, Badge, ConfirmationService, EtatVide, Squelette, type Ton } from '../../shared/components/ui';

type Action = 'suspension' | 'mentor' | 'admin' | 'suppression';

/** Panneau latéral : fiche complète d'un utilisateur et actions d'administration. */
@Component({
  selector: 'app-fiche-utilisateur',
  imports: [RouterLink, Icon, Avatar, Badge, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'fermer.emit()' },
  templateUrl: './fiche-utilisateur.html',
})
export class FicheUtilisateur {
  private readonly api = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly dateHeure = dateHeure;
  protected readonly fcfa = fcfa;
  protected readonly libellesCandidature = {
    EN_ATTENTE: 'En attente',
    ACCEPTE: 'Acceptée',
    REFUSE: 'Refusée',
  };

  readonly id = input.required<number>();
  readonly fermer = output<void>();
  /** Le compte a changé (profil, statut) : la liste doit se rafraîchir. */
  readonly modifie = output<void>();
  readonly supprime = output<void>();

  /** Fiche rechargée automatiquement quand l'utilisateur sélectionné change. */
  protected readonly fiche = httpResource<UtilisateurDetail>(
    () => `${API_ADMIN}/utilisateurs/${this.id()}`,
  );
  protected readonly enCours = signal<Action | null>(null);

  protected readonly erreur = computed(() => messageApi(this.fiche.error()));
  protected readonly estMoi = computed(
    () => this.fiche.hasValue() && this.fiche.value().profil.id === this.auth.profil()?.id,
  );

  protected readonly profil = computed(() => {
    const u = this.fiche.value()?.profil;
    if (!u) return '';
    return u.role === 'ADMIN' ? 'Administrateur' : u.mentor ? 'Mentor' : LIBELLES_ROLE[u.role];
  });

  protected readonly tonProfil = computed<Ton>(() => {
    const u = this.fiche.value()?.profil;
    if (!u || u.role === 'ADMIN') return 'neutre';
    return u.mentor ? 'accent' : u.role === 'ARTISAN' ? 'attention' : 'info';
  });

  protected readonly statistiques = computed(() => {
    const a = this.fiche.value()?.activite;
    if (!a) return [];
    return [
      { libelle: 'Publications', valeur: nombre(a.publications) },
      { libelle: 'Produits en vente', valeur: nombre(a.produits) },
      { libelle: 'Commandes', valeur: nombre(a.commandes) },
      { libelle: 'Formations publiées', valeur: nombre(a.formationsPubliees) },
      { libelle: 'Formations suivies', valeur: nombre(a.formationsSuivies) },
      { libelle: 'Abonnés', valeur: nombre(a.abonnes) },
    ];
  });

  protected readonly coordonnees = computed(() => {
    const d = this.fiche.value();
    if (!d) return [];
    const u = d.profil;
    const ville = [u.ville, d.commune].filter(Boolean).join(' · ');
    return [
      { icone: 'envelope', libelle: 'E-mail', valeur: u.email, lien: `mailto:${u.email}` },
      {
        icone: 'phone',
        libelle: 'Téléphone',
        valeur: u.telephone,
        lien: u.telephone ? `tel:${u.telephone.replace(/\s/g, '')}` : null,
      },
      { icone: 'map-pin', libelle: 'Ville', valeur: ville || null, lien: null },
      { icone: 'storefront', libelle: 'Atelier', valeur: d.adresseAtelier, lien: null },
      {
        icone: 'phone',
        libelle: 'WhatsApp Business',
        valeur: d.lienWhatsapp,
        lien: d.lienWhatsapp,
      },
      {
        icone: 'calendar-blank',
        libelle: 'Inscription',
        valeur: dateHeure(u.dateInscription),
        lien: null,
      },
    ].filter((l) => l.valeur || !['Atelier', 'WhatsApp Business'].includes(l.libelle));
  });

  protected async suspendre(suspendu: boolean): Promise<void> {
    const u = this.fiche.value()!.profil;
    const reponse = await this.confirmation.demander(
      suspendu
        ? {
            titre: `Suspendre le compte de ${u.nom} ?`,
            message:
              "La personne est déconnectée de tous ses appareils et ne pourra plus utiliser Bolono tant que le compte n'est pas réactivé.",
            confirmer: 'Suspendre',
            danger: true,
            champ: { libelle: 'Motif (visible dans la fiche)' },
            notification: u.nom,
          }
        : {
            titre: `Réactiver le compte de ${u.nom} ?`,
            message: 'La personne pourra de nouveau se connecter.',
            confirmer: 'Réactiver',
            notification: u.nom,
          },
    );
    if (!reponse.ok) return;
    this.executer(
      'suspension',
      this.api.definirSuspension(u.id, suspendu, reponse.texte, reponse.notification),
      (r) => {
        this.fiche.value.set(r.utilisateur);
        if (!r.firebaseMisAJour) {
          this.toast.info(
            "Compte bloqué par l'API, mais la connexion Firebase n'a pas pu être désactivée.",
          );
        }
        return suspendu
          ? `Le compte de ${u.nom} est suspendu.`
          : `Le compte de ${u.nom} est réactivé.`;
      },
    );
  }

  protected async basculerMentor(): Promise<void> {
    const u = this.fiche.value()!.profil;
    const { ok, notification } = await this.confirmation.demander(
      u.mentor
        ? {
            titre: `Retirer le statut de mentor à ${u.nom} ?`,
            message:
              'Il ne pourra plus publier de formations ni de statuts. Ses contenus existants sont conservés.',
            confirmer: 'Retirer',
            danger: true,
            notification: u.nom,
          }
        : {
            titre: `Nommer ${u.nom} mentor ?`,
            message:
              'Il pourra publier des formations et des statuts, sans passer par une candidature.',
            confirmer: 'Nommer mentor',
            notification: u.nom,
          },
    );
    if (!ok) return;
    this.executer('mentor', this.api.definirMentor(u.id, !u.mentor, notification), (d) => {
      this.fiche.value.set(d);
      return d.profil.mentor ? `${u.nom} est désormais mentor.` : `${u.nom} n'est plus mentor.`;
    });
  }

  protected async basculerAdmin(): Promise<void> {
    const u = this.fiche.value()!.profil;
    const admin = u.role !== 'ADMIN';
    const { ok, notification } = await this.confirmation.demander(
      admin
        ? {
            titre: `Donner l'accès administrateur à ${u.nom} ?`,
            message:
              'Cette personne pourra ouvrir ce back-office et agir sur tous les comptes et contenus.',
            confirmer: "Donner l'accès",
            danger: true,
            notification: u.nom,
          }
        : {
            titre: `Retirer l'accès administrateur à ${u.nom} ?`,
            message: 'Le compte retrouve son profil habituel (artisan ou acheteur).',
            confirmer: "Retirer l'accès",
            danger: true,
            notification: u.nom,
          },
    );
    if (!ok) return;
    this.executer('admin', this.api.definirAccesAdmin(u.id, admin, notification), (d) => {
      this.fiche.value.set(d);
      return admin ? `${u.nom} est administrateur.` : `${u.nom} n'est plus administrateur.`;
    });
  }

  protected async supprimer(): Promise<void> {
    const u = this.fiche.value()!.profil;
    const { ok } = await this.confirmation.demander({
      titre: `Supprimer définitivement le compte de ${u.nom} ?`,
      message:
        'Préférez la suspension si vous souhaitez pouvoir revenir en arrière. La suppression est irréversible.',
      confirmer: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.enCours.set('suppression');
    this.api.supprimerUtilisateur(u.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(`Le compte de ${u.nom} a été supprimé.`);
        this.supprime.emit();
      },
      error: (e) => {
        this.enCours.set(null);
        this.toast.erreur(
          messageApi(
            e,
            'Suppression impossible : ce compte a encore des données liées. Suspendez-le plutôt.',
          ),
        );
      },
    });
  }

  private executer<T>(
    action: Action,
    requete: Observable<T>,
    succes: (resultat: T) => string,
  ): void {
    this.enCours.set(action);
    requete.subscribe({
      next: (resultat) => {
        this.enCours.set(null);
        this.toast.succes(succes(resultat));
        this.modifie.emit();
      },
      error: (e) => {
        this.enCours.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
