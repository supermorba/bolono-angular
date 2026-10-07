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
import { FormsModule } from '@angular/forms';
import { BadgesService } from './badges.service';
import { mediaUrl, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { BadgeAdmin } from './badges.model';
import { API_ADMIN } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Modale, Televersement } from '../../shared/dialogs/fenetres';
import { Icon } from '../../shared/icons/icon';
import { ConfirmationService, EtatVide, Squelette, EntetePage } from '../../shared/components/ui';

/** Fenêtre de création ou de modification d'un badge. */
@Component({
  selector: 'app-formulaire-badge',
  imports: [FormsModule, Modale, Televersement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulaire-badge.html',
})
export class FormulaireBadge {
  private readonly api = inject(BadgesService);
  private readonly toast = inject(ToastService);

  readonly badge = input<BadgeAdmin | null>(null);
  readonly fermer = output<void>();
  readonly enregistre = output<BadgeAdmin>();

  protected readonly enregistrement = signal(false);
  protected modele = {
    intitule: '',
    description: '',
    categorie: '',
    urlIcone: null as string | null,
  };

  ngOnInit(): void {
    const b = this.badge();
    if (b)
      this.modele = {
        intitule: b.intitule,
        description: b.description ?? '',
        categorie: b.categorie ?? '',
        urlIcone: b.urlIcone,
      };
  }

  protected enregistrer(): void {
    if (!this.modele.intitule.trim()) {
      this.toast.erreur("L'intitulé est obligatoire.");
      return;
    }
    this.enregistrement.set(true);
    this.api
      .enregistrerBadge(this.badge()?.id ?? null, {
        intitule: this.modele.intitule.trim(),
        description: this.modele.description.trim() || null,
        categorie: this.modele.categorie.trim() || null,
        urlIcone: this.modele.urlIcone,
      })
      .subscribe({
        next: (b) => {
          this.enregistrement.set(false);
          this.toast.succes(this.badge() ? 'Badge mis à jour.' : 'Badge créé.');
          this.enregistre.emit(b);
        },
        error: (e) => {
          this.enregistrement.set(false);
          this.toast.erreur(messageApi(e));
        },
      });
  }
}

@Component({
  selector: 'app-badges',
  imports: [EntetePage, Icon, EtatVide, Squelette, FormulaireBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './badges.html',
})
export class BadgesPage {
  private readonly api = inject(BadgesService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly mediaUrl = mediaUrl;
  protected readonly nombre = nombre;

  protected readonly badges = httpResource<BadgeAdmin[]>(() => `${API_ADMIN}/badges`);
  protected readonly erreur = computed(() => messageApi(this.badges.error()));
  protected readonly edite = signal<BadgeAdmin | 'nouveau' | null>(null);

  protected async supprimer(b: BadgeAdmin): Promise<void> {
    const { ok } = await this.confirmation.demander({
      titre: `Supprimer le badge « ${b.intitule} » ?`,
      message:
        (b.obtentions
          ? `Il sera retiré aux ${b.obtentions} utilisateur(s) qui l'ont obtenu. `
          : '') + (b.quiz ? `Les ${b.quiz} quiz qui le décernaient n'en décerneront plus.` : ''),
      confirmer: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.api.supprimerBadge(b.id).subscribe({
      next: () => {
        this.toast.succes('Badge supprimé.');
        this.badges.reload();
      },
      error: (e) => this.toast.erreur(messageApi(e)),
    });
  }
}
