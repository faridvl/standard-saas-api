import { describe, expect, it } from '@jest/globals';
import { scanRoutesWithParams } from './route-scanner';
import { ROUTES_MANIFEST, isExempt } from './routes.manifest';

describe('aislamiento por clínica: cobertura de rutas', () => {
  const routes = scanRoutesWithParams();

  it('encuentra las rutas con parámetro de los controladores', () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  it('toda ruta con parámetro tiene una sonda de aislamiento o una exención con motivo', () => {
    const missing = routes.map((route) => route.key).filter((key) => !(key in ROUTES_MANIFEST));
    expect(missing).toEqual([]);
  });

  it('el manifiesto no guarda rutas que ya no existen', () => {
    const existing = new Set(routes.map((route) => route.key));
    const stale = Object.keys(ROUTES_MANIFEST).filter((key) => !existing.has(key));
    expect(stale).toEqual([]);
  });

  it('cada exención trae un motivo', () => {
    const withoutReason = Object.entries(ROUTES_MANIFEST)
      .filter(([, entry]) => isExempt(entry) && entry.exempt.trim().length < 10)
      .map(([key]) => key);
    expect(withoutReason).toEqual([]);
  });
});
