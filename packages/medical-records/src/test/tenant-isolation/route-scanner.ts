import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export interface ScannedRoute {
  key: string;
  method: string;
  path: string;
  file: string;
}

const CONTROLLERS_DIR = join(__dirname, '..', '..', 'app', 'controllers');
const CONTROLLER_RE = /@Controller\(\s*(?:'([^']*)')?\s*\)/;
const METHOD_RE = /@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)/g;

/** Rutas de los controladores cuyo path recibe algún parámetro (`:id`), leídas del código fuente. */
export function scanRoutesWithParams(): ScannedRoute[] {
  const routes: ScannedRoute[] = [];
  for (const file of readdirSync(CONTROLLERS_DIR)) {
    if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue;
    const source = readFileSync(join(CONTROLLERS_DIR, file), 'utf8');
    const prefix = CONTROLLER_RE.exec(source)?.[1] ?? '';
    for (const match of source.matchAll(METHOD_RE)) {
      const path = '/' + [prefix, match[2] ?? ''].filter(Boolean).join('/');
      if (!path.includes(':')) continue;
      const method = match[1].toUpperCase();
      routes.push({ key: `${method} ${path}`, method, path, file });
    }
  }
  return routes;
}
