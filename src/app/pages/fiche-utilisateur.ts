import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { AdminApi } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';
import { LIBELLES_ROLE, dateHeure, fcfa, nombre } from '../core/format';
import { messageApi } from '../core/http';
import type { UtilisateurDetail } from '../core/models';
import { API_ADMIN } from '../core/ressources';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { Avatar, Badge, ConfirmationService, EtatVide, Squelette, type Ton } from '../shared/ui';

type Action = 'suspension' | 'mentor' | 'admin' | 'suppression';

/** Panneau latéral : fiche complète d'un utilisateur et actions d'administration. */
@Component({
  selector: 'app-fiche-utilisateur',
  imports: [Icon, Avatar, Badge, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'fermer.emit()' },
  template: `
    <div class="fixed inset-0 z-40 bg-brown/30 transition-opacity starting:opacity-0" (click)="fermer.emit()"></div>
    <aside
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-surface shadow-2xl transition-transform duration-200 starting:translate-x-full"
      role="dialog"
      aria-modal="true"
      aria-label="Fiche utilisateur"
    >
      <div class="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 class="text-lg font-extrabold">Fiche utilisateur</h2>
        <button class="rounded-lg p-1.5 text-muted hover:bg-card hover:text-brown" (click)="fermer.emit()" aria-label="Fermer">
          <app-icon name="x" [size]="20" />
        </button>
      </div>

      @if (fiche.error() && !fiche.hasValue()) {
        <app-etat-vide icone="warning" titre="Fiche indisponible" [message]="erreur()">
          <button class="btn-accent btn-sm mt-2" (click)="fiche.reload()">Réessayer</button>
        </app-etat-vide>
      } @else if (fiche.hasValue()) {
        @let d = fiche.value();
        @let u = d.profil;
        <div class="flex-1 overflow-y-auto px-6 py-6">
          <!-- Identité -->
          <div class="flex items-center gap-4">
            <app-avatar [photo]="u.photoUrl" [nom]="u.nom" [size]="72" />
            <div class="min-w-0">
              <p class="truncate text-xl font-extrabold">{{ u.nom }}</p>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                <app-badge [ton]="tonProfil()">{{ profil() }}</app-badge>
                @if (u.mentor && u.role === 'ADMIN') {
                  <app-badge ton="accent">Mentor</app-badge>
                }
                @if (u.suspendu) {
                  <app-badge ton="erreur">Suspendu</app-badge>
                }
                @if (estMoi()) {
                  <app-badge>Vous</app-badge>
                }
              </div>
            </div>
          </div>

          @if (u.suspendu) {
            <div class="mt-5 rounded-xl border border-error/20 bg-error-surface p-3.5 text-sm text-error">
              <p class="flex items-center gap-2 font-semibold"><app-icon name="lock-simple" [size]="16" /> Compte suspendu le {{ dateHeure(d.dateSuspension) }}</p>
              @if (d.motifSuspension) {
                <p class="mt-1 text-error/90">Motif : {{ d.motifSuspension }}</p>
              }
            </div>
          }

          <!-- Activité -->
          <p class="mt-7 mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">Activité</p>
          <div class="grid grid-cols-3 gap-2.5">
            @for (s of statistiques(); track s.libelle) {
              <div class="rounded-xl bg-ochre-surface px-3 py-2.5">
                <p class="text-lg font-extrabold">{{ s.valeur }}</p>
                <p class="text-2xs leading-tight text-muted-strong">{{ s.libelle }}</p>
              </div>
            }
          </div>
          @if (d.activite.totalDepense > 0) {
            <p class="mt-2.5 text-sm text-muted-strong">Total des achats : <b class="text-brown">{{ fcfa(d.activite.totalDepense) }}</b></p>
          }

          <!-- Coordonnées -->
          <p class="mt-7 mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">Coordonnées</p>
          <dl class="space-y-3 text-sm">
            @for (ligne of coordonnees(); track ligne.libelle) {
              <div class="flex items-start gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ochre-surface text-terracotta">
                  <app-icon [name]="ligne.icone" [size]="16" />
                </span>
                <div class="min-w-0">
                  <dt class="text-2xs text-muted">{{ ligne.libelle }}</dt>
                  <dd class="font-medium break-words">
                    @if (ligne.lien) {
                      <a [href]="ligne.lien" target="_blank" rel="noopener" class="text-terracotta hover:underline">{{ ligne.valeur }}</a>
                    } @else {
                      {{ ligne.valeur || '—' }}
                    }
                  </dd>
                </div>
              </div>
            }
          </dl>

          @if (d.profilDeBase === 'ARTISAN') {
            <p class="mt-7 mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">Profil d'artisan</p>
            <dl class="space-y-2.5 text-sm">
              <div><dt class="text-2xs text-muted">Spécialité</dt><dd class="font-medium">{{ u.specialite || '—' }}</dd></div>
              @if (d.domaineExpertise) {
                <div><dt class="text-2xs text-muted">Domaine d'expertise</dt><dd class="font-medium">{{ d.domaineExpertise }}</dd></div>
              }
              @if (d.biographie) {
                <div><dt class="text-2xs text-muted">Biographie</dt><dd class="text-muted-strong">{{ d.biographie }}</dd></div>
              }
              @if (d.candidatureMentor) {
                <div>
                  <dt class="text-2xs text-muted">Dernière candidature de mentorat</dt>
                  <dd class="font-medium">{{ libellesCandidature[d.candidatureMentor] }}</dd>
                </div>
              }
            </dl>
          }
        </div>

        <!-- Actions -->
        <div class="space-y-2 border-t border-line bg-ivory/60 px-6 py-4">
          @if (estMoi()) {
            <p class="text-center text-xs text-muted">Il s'agit de votre propre compte : les actions sensibles sont désactivées.</p>
          } @else {
            <div class="grid grid-cols-2 gap-2">
              @if (u.suspendu) {
                <button class="btn-accent btn-sm" [disabled]="enCours() !== null" (click)="suspendre(false)">
                  @if (enCours() === 'suspension') { <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> }
                  @else { <app-icon name="check-circle" [size]="16" /> }
                  Réactiver le compte
                </button>
              } @else {
                <button class="btn-outline btn-sm text-error!" [disabled]="enCours() !== null" (click)="suspendre(true)">
                  @if (enCours() === 'suspension') { <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-error/30 border-t-error"></span> }
                  @else { <app-icon name="lock-simple" [size]="16" /> }
                  Suspendre
                </button>
              }
              @if (d.profilDeBase === 'ARTISAN') {
                <button class="btn-outline btn-sm" [disabled]="enCours() !== null" (click)="basculerMentor()">
                  @if (enCours() === 'mentor') { <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-terracotta"></span> }
                  @else { <app-icon name="seal-check" [size]="16" /> }
                  {{ u.mentor ? 'Retirer mentor' : 'Nommer mentor' }}
                </button>
              }
              @if (d.profilDeBase !== null) {
                <button class="btn-outline btn-sm" [disabled]="enCours() !== null" (click)="basculerAdmin()">
                  @if (enCours() === 'admin') { <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-terracotta"></span> }
                  @else { <app-icon name="gear-six" [size]="16" /> }
                  {{ u.role === 'ADMIN' ? 'Retirer accès admin' : 'Accès admin' }}
                </button>
              }
              <button class="btn-danger btn-sm" [disabled]="enCours() !== null" (click)="supprimer()">
                @if (enCours() === 'suppression') { <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> }
                @else { <app-icon name="trash" [size]="16" /> }
                Supprimer
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="space-y-4 px-6 py-6">
          <div class="flex items-center gap-4">
            <app-squelette class="w-[72px] shrink-0 rounded-full" [hauteur]="72" />
            <div class="flex-1 space-y-2"><app-squelette [hauteur]="20" /><app-squelette class="w-1/3" [hauteur]="14" /></div>
          </div>
          <div class="grid grid-cols-3 gap-2.5">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <app-squelette [hauteur]="56" />
            }
          </div>
          @for (i of [1, 2, 3, 4]; track i) {
            <app-squelette [hauteur]="36" />
          }
        </div>
      }
    </aside>
  `,
})
export class FicheUtilisateur {
  private readonly api = inject(AdminApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly dateHeure = dateHeure;
  protected readonly fcfa = fcfa;
  protected readonly libellesCandidature = { EN_ATTENTE: 'En attente', ACCEPTE: 'Acceptée', REFUSE: 'Refusée' };

  readonly id = input.required<number>();
  readonly fermer = output<void>();
  /** Le compte a changé (profil, statut) : la liste doit se rafraîchir. */
  readonly modifie = output<void>();
  readonly supprime = output<void>();

  /** Fiche rechargée automatiquement quand l'utilisateur sélectionné change. */
  protected readonly fiche = httpResource<UtilisateurDetail>(() => `${API_ADMIN}/utilisateurs/${this.id()}`);
  protected readonly enCours = signal<Action | null>(null);

  protected readonly erreur = computed(() => messageApi(this.fiche.error()));
  protected readonly estMoi = computed(() => this.fiche.hasValue() && this.fiche.value().profil.id === this.auth.profil()?.id);

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
      { icone: 'phone', libelle: 'Téléphone', valeur: u.telephone, lien: u.telephone ? `tel:${u.telephone.replace(/\s/g, '')}` : null },
      { icone: 'map-pin', libelle: 'Ville', valeur: ville || null, lien: null },
      { icone: 'storefront', libelle: 'Atelier', valeur: d.adresseAtelier, lien: null },
      { icone: 'phone', libelle: 'WhatsApp Business', valeur: d.lienWhatsapp, lien: d.lienWhatsapp },
      { icone: 'calendar-blank', libelle: 'Inscription', valeur: dateHeure(u.dateInscription), lien: null },
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
    this.executer('suspension', this.api.definirSuspension(u.id, suspendu, reponse.texte, reponse.notification), (r) => {
      this.fiche.value.set(r.utilisateur);
      if (!r.firebaseMisAJour) {
        this.toast.info("Compte bloqué par l'API, mais la connexion Firebase n'a pas pu être désactivée.");
      }
      return suspendu ? `Le compte de ${u.nom} est suspendu.` : `Le compte de ${u.nom} est réactivé.`;
    });
  }

  protected async basculerMentor(): Promise<void> {
    const u = this.fiche.value()!.profil;
    const { ok, notification } = await this.confirmation.demander(
      u.mentor
        ? {
            titre: `Retirer le statut de mentor à ${u.nom} ?`,
            message: "Il ne pourra plus publier de formations ni de statuts. Ses contenus existants sont conservés.",
            confirmer: 'Retirer',
            danger: true,
            notification: u.nom,
          }
        : {
            titre: `Nommer ${u.nom} mentor ?`,
            message: 'Il pourra publier des formations et des statuts, sans passer par une candidature.',
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
            message: 'Cette personne pourra ouvrir ce back-office et agir sur tous les comptes et contenus.',
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
      message: 'Préférez la suspension si vous souhaitez pouvoir revenir en arrière. La suppression est irréversible.',
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
        this.toast.erreur(messageApi(e, 'Suppression impossible : ce compte a encore des données liées. Suspendez-le plutôt.'));
      },
    });
  }

  private executer<T>(action: Action, requete: Observable<T>, succes: (resultat: T) => string): void {
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
