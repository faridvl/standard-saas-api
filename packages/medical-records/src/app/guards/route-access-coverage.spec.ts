import 'reflect-metadata';
import { readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from '@jest/globals';
import { AuthGuard } from '@project/core';
import { ACCESS_METADATA_KEY } from '@medical-records/app/decorators/access.decorators';
import { AccessGuard } from '@medical-records/app/guards/access.guard';

const CONTROLLERS_DIR = join(__dirname, '..', 'controllers');

/** Únicas rutas sin AuthGuard/AccessGuard, a propósito: su propio control está en el método. */
const PUBLIC_ROUTES = new Set([
  'AppointmentTypeController.initialize',
  'CalendarFeedController.feed',
]);

type Handler = (...args: never[]) => unknown;
interface RouteInfo {
  id: string;
  hasGuards: boolean;
  hasRequirement: boolean;
}

function guardsOf(target: object): unknown[] {
  return (Reflect.getMetadata('__guards__', target) as unknown[] | undefined) ?? [];
}

function collectRoutes(): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const files = readdirSync(CONTROLLERS_DIR).filter((file) => /\.controllers?\.ts$/.test(file));

  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const exported = require(join(CONTROLLERS_DIR, file)) as Record<string, unknown>;
    for (const value of Object.values(exported)) {
      if (typeof value !== 'function' || Reflect.getMetadata('path', value) === undefined) continue;
      const controller = value as { name: string; prototype: Record<string, unknown> };

      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = controller.prototype[name] as Handler;
        if (name === 'constructor' || typeof handler !== 'function') continue;
        const method = Reflect.getMetadata('method', handler) as number | undefined;
        if (method === undefined) continue;

        const guards = [...guardsOf(controller), ...guardsOf(handler)];
        routes.push({
          id: `${controller.name}.${name}`,
          hasGuards: guards.includes(AuthGuard) && guards.includes(AccessGuard),
          hasRequirement:
            Reflect.getMetadata(ACCESS_METADATA_KEY, handler) !== undefined ||
            Reflect.getMetadata(ACCESS_METADATA_KEY, controller) !== undefined,
        });
      }
    }
  }
  return routes;
}

describe('cobertura de acceso de las rutas', () => {
  const routes = collectRoutes();

  it('encuentra las rutas de los controladores', () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it('toda ruta tiene AuthGuard y AccessGuard, salvo las públicas declaradas', () => {
    const sinGuards = routes
      .filter((r) => !r.hasGuards && !PUBLIC_ROUTES.has(r.id))
      .map((r) => r.id);
    expect(sinGuards).toEqual([]);
  });

  it('toda ruta con guards tiene su clasificación de acceso', () => {
    const sinClasificar = routes
      .filter((r) => !PUBLIC_ROUTES.has(r.id) && !r.hasRequirement)
      .map((r) => r.id);
    expect(sinClasificar).toEqual([]);
  });

  it('las rutas públicas declaradas existen y no llevan clasificación de acceso', () => {
    const ids = new Set(routes.map((r) => r.id));
    for (const id of PUBLIC_ROUTES) {
      expect(ids.has(id)).toBe(true);
      expect(routes.find((r) => r.id === id)?.hasGuards).toBe(false);
    }
  });
});
