# Capturas do refinamento do mapa

Ferramentas das Fases A e B de `docs/design/mapa-refino.md`. Nada disto corre no CI nem chega ao
build de produção.

| Ficheiro                             | O que faz                                                                                                                                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build-fixture.mjs`                  | Fixture **sintético** (nenhum dado real): 1523 empresas com nomes inventados e posições dos pontos CP7 do GISCO (`aecc-api/AECC.Api/Data/PostalCodes/pt-cp7.csv.gz`); 1487 em Cascais, 34 noutros concelhos da caixa e 2 fora; ~9% `area` no centróide do CP4; 13 categorias. |
| `api-proxy.mjs`                      | Só para o nativo: serve o fixture em `GET /api/companies/map` e `GET /api/categories`, um detalhe sintético (localidade) das empresas do fixture, e encaminha o resto para a stack E2E.                                                                                       |
| `native-shots.sh`                    | Capturas iOS/Android **sem Maestro**: relança a app, deep links `aecc://map[?company=]`, aparência do sistema e `simctl io` / `adb screencap`; guarda a hierarquia de cada captura.                                                                                           |
| `native-area.mjs`                    | Área do mapa visível nas capturas nativas, medida na hierarquia guardada com cada uma (ecrã menos as superfícies flutuantes e a tab bar).                                                                                                                                     |
| `bundle-size.sh`                     | Export web e tamanho do JS inicial e dos chunks do mapa.                                                                                                                                                                                                                      |
| `e2e/web/capture/map-refino.spec.ts` | Capturas web e área do mapa (grelha de `elementFromPoint`). As regras (atribuição, "(i)", GISCO, Esc, sem domínios externos) estão em `e2e/web/specs/map-rules.spec.ts` e `map.spec.ts`, no gate.                                                                             |

## Tiles

As capturas precisam dos tiles reais (a fixture do E2E tem um basemap vazio e glyphs vazios). Faz-se
uma cópia local, fora do repositório, a partir do nosso servidor:

```bash
T=.artifacts/map-tiles; mkdir -p "$T/sprites/v4"
curl -sfo "$T/cascais.pmtiles" https://aecc.salv4.com/tiles/cascais.pmtiles
for f in light dark; do for v in "" @2x; do for e in json png; do
  curl -sfo "$T/sprites/v4/$f$v.$e" "https://aecc.salv4.com/tiles/sprites/v4/$f$v.$e"; done; done; done
for s in "Noto Sans Regular" "Noto Sans Medium" "Noto Sans Italic"; do mkdir -p "$T/fonts/$s"
  for r in 0-255 256-511 8192-8447; do
    curl -sfo "$T/fonts/$s/$r.pbf" "https://aecc.salv4.com/tiles/fonts/${s// /%20}/$r.pbf"; done; done
cp e2e/web/fixtures/tiles/fonts/glyphs.pbf e2e/web/fixtures/tiles/empty-style.json "$T/" 2>/dev/null
mv "$T/glyphs.pbf" "$T/fonts/"
```

O `serve-static.mjs` serve `fonts/<stack>/<range>.pbf` quando o ficheiro existe; senão, o
`fonts/glyphs.pbf` da fixture.

## Web

```bash
node scripts/map/capture/build-fixture.mjs ../aecc-api/AECC.Api/Data/PostalCodes/pt-cp7.csv.gz .artifacts/map-fixture
set -a; source ../aecc-api/.env.e2e; set +a
CAPTURE=1 E2E_TILES_DIR=.artifacts/map-tiles CAPTURE_FIXTURE=.artifacts/map-fixture \
  CAPTURE_PREFIX=b CAPTURE_OUT=docs/design/mapa-refino/b npx playwright test --project=capture
```

## Nativo

A app tem de estar instalada (build de debug) e com sessão. O MapLibre nativo guarda os tiles em
cache por URL: os tiles reais ficam na porta 8091 (a fixture vazia do Maestro usa a 8090).

```bash
node scripts/map/capture/api-proxy.mjs .artifacts/map-fixture 5090 &
node e2e/web/serve-static.mjs .artifacts/empty 8091 .artifacts/map-tiles &
EXPO_PUBLIC_API_URL=http://127.0.0.1:5090/api EXPO_PUBLIC_TILES_URL=http://127.0.0.1:8091/tiles \
  npx expo start --port 8081 --clear &
adb reverse tcp:8081 tcp:8081; adb reverse tcp:5090 tcp:5090; adb reverse tcp:8091 tcp:8091
OPEN_WAIT=1 scripts/map/capture/native-shots.sh ios b .artifacts/native-final <company-id>
BOOT_WAIT=30 scripts/map/capture/native-shots.sh android b .artifacts/native-final <company-id>
node scripts/map/capture/native-area.mjs .artifacts/native-final
```

No iOS o `maestro hierarchy` leva ≈ 17 s, mais do que os 5 s da atribuição: o estado "card
fechado" (OSM aberta) não tem hierarquia própria no iOS (ver o documento).
