import { texteActivite } from './activity.presentation';

describe('texteActivite', () => {
  it('remplace acheteur par membre pour les inscriptions', () => {
    expect(texteActivite('INSCRIPTION', 'Nouvel acheteur inscrit')).toBe(
      'Nouvel membre inscrit',
    );
    expect(texteActivite('INSCRIPTION', 'Acheteurs inscrits')).toBe('Membres inscrits');
    expect(texteActivite('INSCRIPTION', 'ACHETEUR inscrit')).toBe('MEMBRE inscrit');
  });

  it('conserve le texte des autres activités', () => {
    expect(texteActivite('COMMANDE', 'Commande d’un acheteur')).toBe('Commande d’un acheteur');
  });
});
