import { compact, fcfa, ilYa, initiales, mediaUrl } from './format';

describe('format', () => {
  it('formate les montants en FCFA', () => {
    expect(fcfa(3542600)).toBe('3 542 600 FCFA');
    expect(fcfa(0)).toBe('0 FCFA');
  });

  it('compacte les montants des axes', () => {
    expect(compact(4_000_000)).toBe('4M');
    expect(compact(1_250_000)).toBe('1,3M');
    expect(compact(850_000)).toBe('850k');
    expect(compact(12)).toBe('12');
  });

  it('exprime une date relative', () => {
    const maintenant = new Date('2026-09-28T12:00:00').getTime();
    expect(ilYa('2026-09-28T11:48:00', maintenant)).toBe('Il y a 12 min');
    expect(ilYa('2026-09-28T09:00:00', maintenant)).toBe('Il y a 3 h');
    expect(ilYa('2026-09-26T12:00:00', maintenant)).toBe('Il y a 2 j');
    expect(ilYa(null)).toBe('');
  });

  it('résout les URL de médias comme l’app mobile', () => {
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl('   ')).toBeNull();
    expect(mediaUrl('https://cdn.bolono.ml/a.jpg')).toBe('https://cdn.bolono.ml/a.jpg');
    expect(mediaUrl('http://10.0.0.5:8080/api/uploads/view?bucket=b&key=k')).toBe(
      'http://localhost:8080/api/uploads/view?bucket=b&key=k',
    );
    expect(mediaUrl('produits/tapis.jpg')).toBe(
      'http://localhost:8080/api/uploads/view?bucket=bolono-publications&key=produits%2Ftapis.jpg',
    );
  });

  it('calcule les initiales', () => {
    expect(initiales('Aminata Maïga')).toBe('AM');
    expect(initiales('Moussa')).toBe('M');
    expect(initiales('')).toBe('?');
  });
});
