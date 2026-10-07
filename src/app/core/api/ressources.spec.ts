import { sansVides } from './ressources';

describe('sansVides', () => {
  it('retire les paramètres vides mais garde zéro', () => {
    expect(sansVides({ q: '', role: 'ARTISAN', statut: null, page: 0, x: undefined })).toEqual({
      role: 'ARTISAN',
      page: 0,
    });
  });
});
