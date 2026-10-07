import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CoursesService } from './courses.service';
import { API_ADMIN, derniereValeur, sansVides } from '../../core/api/ressources';
import { dateCourte, mediaUrl, nombre } from '../../core/utils/format';
import { messageApi } from '../../core/auth/http';
import type { FormationStat } from './courses.model';
import { ToastService } from '../../core/notifications/toast.service';
import { Icon } from '../../shared/icons/icon';
import {
  ChiffresCles,
  ConfirmationService,
  EtatVide,
  Squelette,
  EntetePage,
  type ChiffreCle,
} from '../../shared/components/ui';

type Tri = 'apprenants' | 'tauxCompletion' | 'dateCreation';

@Component({
  selector: 'app-formations',
  imports: [EntetePage, ChiffresCles, RouterLink, Icon, EtatVide, Squelette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formations.html',
})
export class FormationsPage {
  private readonly api = inject(CoursesService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  protected readonly nombre = nombre;
  protected readonly dateCourte = dateCourte;
  protected readonly mediaUrl = mediaUrl;

  readonly q = input<string>();

  protected readonly saisie = linkedSignal(() => this.q() ?? '');
  protected readonly recherche = linkedSignal(() => this.q() ?? '');
  protected readonly tri = signal<Tri>('apprenants');

  /** Relancée à chaque nouvelle recherche. */
  protected readonly liste = httpResource<FormationStat[]>(() => ({
    url: `${API_ADMIN}/formations`,
    params: sansVides({ q: this.recherche().trim() }),
  }));
  protected readonly page = derniereValeur(this.liste);
  protected readonly formations = this.page;
  protected readonly erreur = computed(() => messageApi(this.liste.error()));
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  protected ouvrir(id: number): void {
    void this.router.navigate(['/formations', id]);
  }

  protected readonly triees = computed(() => {
    const cle = this.tri();
    return [...(this.formations() ?? [])].sort((a, b) =>
      cle === 'dateCreation'
        ? (b.dateCreation ?? '').localeCompare(a.dateCreation ?? '')
        : (b[cle] as number) - (a[cle] as number),
    );
  });

  protected readonly synthese = computed<ChiffreCle[]>(() => {
    const liste = this.formations();
    const apprenants = liste?.reduce((s, f) => s + f.apprenants, 0) ?? 0;
    const termines = liste?.reduce((s, f) => s + f.termines, 0) ?? 0;
    return [
      { libelle: 'Formations publiées', valeur: liste ? nombre(liste.length) : null },
      { libelle: 'Inscriptions aux formations', valeur: liste ? nombre(apprenants) : null },
      {
        libelle: 'Complétion moyenne',
        valeur: !liste ? null : apprenants ? `${Math.round((termines / apprenants) * 100)}%` : '—',
      },
    ];
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected rechercher(q: string): void {
    this.saisie.set(q);
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => this.recherche.set(q), 300);
  }

  protected async supprimer(f: FormationStat): Promise<void> {
    const { ok, notification } = await this.confirmation.demander({
      titre: `Supprimer « ${f.titre} » ?`,
      message: `La formation, ses ${f.modules} module(s) et la progression de ses ${f.apprenants} apprenant(s) seront supprimés définitivement.`,
      confirmer: 'Supprimer',
      danger: true,
      notification: f.auteur,
    });
    if (!ok) return;
    this.api.supprimerFormation(f.id, notification).subscribe({
      next: () => {
        this.toast.succes(`« ${f.titre} » a été supprimée.`);
        this.liste.reload();
      },
      error: (e) => this.toast.erreur(messageApi(e, 'Suppression impossible.')),
    });
  }
}
