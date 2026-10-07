import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { StatusesService } from './statuses.service';
import { dateHeure, ilYa, mediaUrl, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { Page } from '../../core/models/common.model';
import type { StatutMentorAdmin } from './statuses.model';
import { API_ADMIN, derniereValeur, sansVides } from '../../core/api/ressources';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';
import { Avatar, ConfirmationService, EtatVide, Pagination, EntetePage } from '../../shared/components/ui';

/** Statuts éphémères (24 h) publiés par les mentors. */
@Component({
  selector: 'app-statuts',
  imports: [EntetePage, Icon, Avatar, EtatVide, Pagination],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'apercu.set(null)' },
  templateUrl: './statuts.html',
})
export class StatutsPage {
  private readonly api = inject(StatusesService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly mediaUrl = mediaUrl;
  protected readonly ilYa = ilYa;
  protected readonly dateHeure = dateHeure;
  protected readonly nombre = nombre;

  protected readonly actifs = signal(true);
  protected readonly numero = linkedSignal(() => {
    this.actifs();
    return 0;
  });
  protected readonly liste = httpResource<Page<StatutMentorAdmin>>(() => ({
    url: `${API_ADMIN}/statuts`,
    params: sansVides({ actifs: String(this.actifs()), page: this.numero(), size: 24 }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  protected readonly apercu = signal<StatutMentorAdmin | null>(null);
  protected readonly suppression = signal<number | null>(null);

  protected async supprimer(s: StatutMentorAdmin): Promise<void> {
    const { ok, notification } = await this.confirmation.demander({
      titre: 'Supprimer ce statut ?',
      message: `Le statut de ${s.auteur?.nom ?? 'ce mentor'} et ses ${s.vues} vue(s) seront supprimés.`,
      confirmer: 'Supprimer',
      danger: true,
      notification: s.auteur?.nom ?? 'le mentor',
    });
    if (!ok) return;
    this.suppression.set(s.id);
    this.api.supprimerStatut(s.id, notification).subscribe({
      next: () => {
        this.suppression.set(null);
        this.apercu.set(null);
        this.toast.succes('Statut supprimé.');
        this.liste.reload();
      },
      error: (e) => {
        this.suppression.set(null);
        this.toast.erreur(messageApi(e));
      },
    });
  }
}
