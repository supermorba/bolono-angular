import type { UtilisateurAdmin } from '../users/users.model';
import type { ProduitAdmin } from '../products/products.model';
import type { FormationStat } from '../courses/courses.model';

export interface ResultatsRecherche {
  utilisateurs: UtilisateurAdmin[];
  produits: ProduitAdmin[];
  formations: FormationStat[];
}
