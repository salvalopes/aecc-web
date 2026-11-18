import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';

// Verificações estáticas do código do mapa (sem browser), complemento dos testes de comportamento
// em map.spec.ts para o que o browser não consegue provar (ex.: o nativo).

const ROOT = join(__dirname, '..', '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}
const APP_FILES = [...sourceFiles(join(ROOT, 'app')), ...sourceFiles(join(ROOT, 'src'))];
const read = (path: string) => readFileSync(path, 'utf8');
/** O código sem comentários (os comentários explicam o que NÃO se usa). */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
const rel = (path: string) => relative(ROOT, path);

test('regra 1: a posição nunca vem dos componentes de localização do MapLibre', () => {
  // UserLocation, NativeUserLocation, useCurrentPosition, LocationManager e trackUserLocation
  // ativam o location manager próprio da biblioteca.
  const forbidden =
    /\b(UserLocation|NativeUserLocation|useCurrentPosition|LocationManager|trackUserLocation|GeolocateControl)\b/;
  const offenders = APP_FILES.filter((f) => forbidden.test(code(f))).map(rel);
  expect(offenders).toEqual([]);
});

test('regra 1: só os hooks useUserPosition pedem a posição (expo-location / navigator.geolocation)', () => {
  const users = APP_FILES.filter((f) =>
    /from 'expo-location'|navigator\.geolocation/.test(read(f)),
  ).map(rel);
  expect(users.sort()).toEqual([
    'src/hooks/useUserPosition.ts',
    'src/hooks/useUserPosition.web.ts',
  ]);
  // Um único pedido por toque: sem watch.
  for (const f of users) {
    expect(read(join(ROOT, f))).not.toMatch(/watchPosition(Async)?\(/);
  }
});

test('regra 2: a posição não é guardada nem registada (hooks e ecrã do mapa)', () => {
  const files = [
    'src/hooks/useUserPosition.ts',
    'src/hooks/useUserPosition.web.ts',
    'src/components/map/MapScreen.tsx',
    'src/components/map/CompanyMap.tsx',
    'src/components/map/CompanyMap.web.tsx',
  ];
  const storageOrLogs =
    /AsyncStorage|SecureStore|localStorage|sessionStorage|indexedDB|console\.|fetch\(|apiClient/;
  const offenders = files.filter((f) => storageOrLogs.test(code(join(ROOT, f))));
  expect(offenders).toEqual([]);
});

test('regra 7: o mapa e as definições de mapa só existem dentro de app/(app)/ (sessão)', () => {
  const mapRoutes = sourceFiles(join(ROOT, 'app'))
    .map(rel)
    .filter((f) => /map|unlocated/i.test(f));
  expect(mapRoutes.length).toBeGreaterThan(0);
  for (const f of mapRoutes) expect(f.startsWith('app/(app)/')).toBe(true);
});
