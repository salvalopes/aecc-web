# Mapa de empresas (Fase 6 do redesign): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar, a utilizadores autenticados, um mapa das empresas associadas (clusters, filtro por categoria, ficha → detalhe, botão "a minha posição"), com tiles, estilos, glyphs e geocodificação alojados por nós e com proteção dos ENI por desenho.

**Architecture:** O aecc-api guarda as coordenadas geocodificadas localmente a partir de uma tabela de códigos postais (GISCO). Expõe um endpoint autenticado e mínimo que decide no servidor a precisão de cada ponto: exato ou zona CP4. A app desenha o mapa com MapLibre: no nativo com `@maplibre/maplibre-react-native` e no web com `maplibre-gl` num `.web.tsx`. Lê um PMTiles da região servido pelo Caddy em `aecc.salv4.com/tiles/` e usa estilos Maré claro/escuro gerados no repo.

**Tech Stack:** Expo SDK 55 · RN 0.83.10 (New Arch) · Expo Router 55 · MapLibre RN 11.5.1 · maplibre-gl 5.24.1 · pmtiles 4.5.0 · expo-location ~55.1.15 · .NET 9 / EF Core 9.0.4 / Npgsql · PostgreSQL 16 · Caddy 2.11.2 · Protomaps basemaps (OSM, ODbL).

**Spec:** a mensagem de decisões de 16/11/2026 (secção 0 deste documento resume-a) + `docs/DESIGN.md` (direção Maré).

**Estado:** Fase A (análise + plano). Nada implementado. **Aguarda aprovação**, incluindo das dependências da secção 9.1.

---

## 0. Decisões já tomadas (não reabrir)

| # | Decisão |
|---|---|
| D-infra | Tiles PMTiles, glyphs e sprites servidos pelo Caddy do servidor (Alemanha) em `aecc.salv4.com`. Sem Google, Mapbox, CDN de terceiros ou Cloudflare neste fluxo. |
| D-loc | Botão "mostrar a minha posição". Permissão "só enquanto a app está em uso". A posição só é lida ao tocar no botão e nunca é enviada nem guardada. `expo-location` no nativo, `navigator.geolocation` no web. |
| D-pc | Pessoas coletivas: morada o mais exata possível. |
| D-eni | ENI (pela classificação do NIF): só a zona CP4, salvo opt-in do dono para pino exato. As coordenadas exatas de um ENI sem opt-in nunca saem do servidor. |
| D-out | Qualquer empresa pode ser escondida do mapa pelo dono. O admin também pode escondê-la. |
| D-auth | O mapa só existe para utilizadores autenticados. |
| D-nav | Tabs finais: Admin = Início, Empresas, Mapa, Editar, **Gestão** · Associado = Início, Empresas, Mapa, Editar, Perfil · Cliente = Início, Empresas, Mapa, Perfil. A tab Utilizadores desaparece. `/users`, `/users/new` e `/users/:id/edit` continuam a funcionar. |
| D-filtro | O filtro por categorias usa os mesmos chips e categorias do diretório. |
| D-design | Direção Maré, estilos de mapa claro e escuro próprios a seguir o tema, e atribuição OSM (ODbL) e da origem dos tiles visível. |

## Global Constraints

- O SDK fica no Expo 55 (`expo ~55.0.32`), com `react-native 0.83.10` e a New Architecture. Pacotes Expo instalam-se sempre com `npx expo install`.
- As dependências novas são **só** as da secção 9.1, nas versões exatas indicadas, depois de aprovadas. Não entram reanimated, gesture-handler, haptics nem bibliotecas de ícones.
- Estilos usam `createStyles(theme)` + `useStyles()`, sem literais de cor, espaçamento ou tipografia nos ecrãs, e as primitivas de `@/components/ui`.
  - **Exceção:** os JSON de estilo do mapa, que são dados do MapLibre gerados a partir de `src/theme/palette.ts` (Tarefa W2).
- Os `testID` existentes são contrato. `tab.profile` mantém-se para Admin (Gestão), Associado e Cliente.
- **Nunca** imprimir, logar ou devolver NIF, morada de pessoa singular ou coordenadas exatas de ENI sem opt-in. Comandos e testes reportam só contagens.
- O endpoint do mapa devolve apenas `id, name, categoryId, lat, lng, precision`.
- No aecc-api, cada PR passa `dotnet test AECC.slnx -c Release`.
- No aecc-web, cada PR passa `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e`. Os fluxos Maestro novos correm em iOS 26.3 e Android 36.
- O motion do mapa (fly-to, expansão de clusters) é especificação de comportamento: usa só as animações de câmara do próprio MapLibre, sem dependências de animação.

## Review Focus

1. **Vários ENI no mesmo CP4 caem no mesmo ponto.** O cluster não se desfaz no zoom máximo. Ao tocar no cluster no zoom máximo, ou num cluster cujas folhas partilham coordenadas, deve abrir a lista das empresas (`getClusterLeaves`) em vez de não acontecer nada. Teste em W4.
2. **Fuga de coordenadas exatas de ENI por outra via:** `CompanyDto`, `/directory`, ordenação ou contagens. O teste A3 confirma que nenhum outro DTO ganhou `latitude`/`longitude`, e o teste de payload verifica o conjunto exato de propriedades.
3. **Permissão de localização negada, ou web sem `navigator.geolocation`/HTTP inseguro.** O botão mostra um estado "sem permissão" com explicação e o mapa continua usável. Teste em W5 (Playwright `context.grantPermissions([])`) e Maestro.
4. **Categoria sem empresas com localização.** Mostrar um estado vazio com "Limpar filtro", não um mapa vazio sem explicação. Teste em W4.
5. **NIF em falta, com dígito de controlo inválido ou com prefixo desconhecido.** Classificar como protegido (CP4), fail-closed. Teste em A1.

---

## 1. Biblioteca de mapa (recomendação)

**Recomendado:** `@maplibre/maplibre-react-native` **11.5.1** em iOS/Android e `maplibre-gl` **5.24.1** + `pmtiles` **4.5.0** no web, num ficheiro `.web.tsx`.

**`@maplibre/maplibre-react-native` 11.5.1** (2026-10-29, MIT):
- Peer deps: `react-native >=0.80.0`, `react >=19.1.0`, `expo >=54` opcional. O projeto tem RN 0.83.10 e React 19.2.0 (`package.json`), por isso é compatível.
- A partir da v11 só suporta a New Architecture (Fabric/codegen).
- Config plugin `"@maplibre/maplibre-react-native"`: no iOS é obrigatório (Podfile `post_install`); no Android é opcional.
- **Exige dev build.** Não corre no Expo Go, o que já é o caso deste projeto (`docs/native/`).
- SDKs nativos incluídos: Android `org.maplibre.gl:android-sdk` 13.6.1 e iOS `maplibre-gl-native-distribution` 6.31.0.
- **PMTiles nativo:** o esquema `pmtiles://` existe desde Android 11.8.0 e iOS 6.10.0 (PR maplibre-native #2882), portanto está coberto. O URL tem de ser absoluto (`pmtiles://https://aecc.salv4.com/tiles/cascais.pmtiles`). Fontes PMTiles não usam cache nem offline packs.
- **Clustering nativo:** `GeoJSONSource` com `cluster`, `clusterRadius`, `clusterMaxZoom`, `clusterProperties`. A ref expõe `getClusterExpansionZoom`, `getClusterLeaves` e `getClusterChildren`. Não é precisa nenhuma dependência extra.
- API v11: `Map`, `Camera`, `GeoJSONSource`, `Layer` (com `type`) e `Images`. Os nomes da v10 (`MapView`, `ShapeSource`, `CircleLayer`) não se usam.
- **Localização:** a biblioteca tem um location manager próprio, ativado só por `UserLocation`, `NativeUserLocation`, `useCurrentPosition` ou `Camera trackUserLocation`. **Não usamos nenhum destes.** A posição vem do `expo-location` e é desenhada como uma `GeoJSONSource` de 1 ponto. O manifest Android da biblioteca declara `ACCESS_FINE/COARSE_LOCATION`, as mesmas permissões do expo-location; não há permissão de background.
- Fontes: npmjs.com/package/@maplibre/maplibre-react-native, maplibre.org/maplibre-react-native/docs/setup/{getting-started,expo}, maplibre.org/maplibre-native/android/examples/data/PMTiles/.

**`maplibre-gl` 5.24.1** (`latest-5`) e não a 6.18.0:
- A v6 (2026-07-22) passou a ser só ESM, carrega o worker por URL (`maplibre-gl-worker.mjs`) e exige WebGL2.
- O bundling ESM e worker no **Metro web** (`app.config.ts:40-44`, `bundler: 'metro'`) **não está verificado**.
- A 5.x tem bundle UMD com worker inline (cerca de 276 KB gzip, contra cerca de 296 + 147 KB na v6).
- A Tarefa W3 tem um passo de spike: se a v6 compilar e correr no Metro web, sobe-se para 6.18.0 numa tarefa à parte.

**`pmtiles` 4.5.0** (BSD-3, cerca de 8 KB gzip): `maplibregl.addProtocol('pmtiles', new Protocol().tile)`.

**Alternativas sem fornecedor externo:**
- `react-native-maps` e `expo-maps` estão **excluídas**: usam Apple Maps e Google Maps (o Android exige chave Google).
- Leaflet em WebView funciona com tiles próprios, mas tem gestos e desempenho fracos e acrescenta uma bridge. Fica só como último recurso.

## 2. Tiles, estilos, glyphs e sprites

### 2.1 Dados e região
- **Origem:** build diária Protomaps (OSM), `https://build.protomaps.com/YYYYMMDD.pmtiles`. O build de 2026-11-15 tem 139,5 GB, mas **não se descarrega**.
- O `pmtiles extract` lê só os ranges da região:
  ```
  pmtiles extract https://build.protomaps.com/20261115.pmtiles cascais.pmtiles --bbox=-9.52,38.62,-9.10,38.86 --maxzoom=15
  ```
  Ferramenta: go-pmtiles **v1.31.2** (binário do GitHub release). Não é dependência do projeto.
- **Região:** o concelho de Cascais vai aproximadamente de −9.49 a −9.29 de longitude e de 38.67 a 38.80 de latitude. O bbox acima acrescenta margem para Sintra, Oeiras e Lisboa ocidental.
- **Ainda não está confirmado se há associadas fora do concelho.** As moradas reais só existem na BD de produção: o CSV local não tem moradas e o `.xlsx` não está no repo.
  - A Tarefa A4 tem um `geocode-companies --dry-run` que imprime só agregados, entre eles a contagem por CP4 e a bbox das coordenadas encontradas.
  - Corre-se uma vez no servidor antes de fixar o bbox. CP4 de Cascais: 2645–2649 (parte), 2750–2789.
- **Tamanho:** não verificado. A ordem de grandeza é 15–50 MB a z15; cada zoom a mais duplica, aproximadamente. O MapLibre faz overzoom acima de z15. O tamanho medido fica registado na T-infra.
- **Licença e atribuição:**
  - Os tiles são ODbL (Produced Work do OSM), o design Protomaps é CC0 e o código BSD-3.
  - A atribuição visível no mapa é: **"© OpenStreetMap · Protomaps"**, com links para openstreetmap.org/copyright e github.com/protomaps/basemaps.
  - Acrescenta-se **"Posições: © EU GISCO"**, ver secção 3.

### 2.2 Estilos Maré claro/escuro
- Os estilos são gerados por script com `@protomaps/basemaps` **5.7.2** (devDependency, BSD-3): `layers('protomaps', flavor, { lang: 'pt' })`.
- O flavor é custom: `{...namedFlavor('light'|'dark'), ...overrides}`, com os overrides vindos de `mareLight`/`mareDark` (`src/theme/palette.ts:5-63`):
  - `bg` → terra;
  - `horizon` → água;
  - `surface`/`raised` → edifícios e parques;
  - `border` → estradas secundárias;
  - `text2` → etiquetas.
  - O `accent` fica reservado aos pinos.
  - O mapa não usa cores fora da paleta.
- O script é `scripts/map/build-styles.mjs`. Gera `src/components/map/styles/mare-light.json` e `mare-dark.json` (só `layers`), que ficam versionados no git e acompanham o código.
- O URL dos tiles, dos glyphs e dos sprites é injetado em runtime por `buildMapStyle()` (W2). O tema troca de estilo sem pedidos ao servidor.
- **Glyphs:**
  - Por omissão, Noto Sans de `protomaps/basemaps-assets` (SIL OFL).
  - Recomendação: gerar PBF da **Geist** (OFL) com `maplibre/font-maker`, para cumprir "Geist, única família".
  - A fonte não é verificada aqui. Se a geração falhar, ficam as Noto e isso é registado.
- **Sprites:** `protomaps/basemaps-assets` `sprites/v4/{light,dark}` (MIT). Ficam alojados por nós.

### 2.3 Servidor: só documentação, sem alterar nada agora
- **Caminho:** `/home/deploy/aecc/tiles/`. **Não pode** ficar em `/home/deploy/aecc/web/`, porque o deploy do web faz `rsync --delete` para aí (`.github/workflows/deploy.yml:94-96`) e apagaria os tiles. O ficheiro também não entra no git.
  ```
  /home/deploy/aecc/tiles/
    cascais.pmtiles
    fonts/{fontstack}/{range}.pbf
    sprites/v4/light{,@2x}.{json,png}  sprites/v4/dark…
    ATTRIBUTION.txt
  ```
- **Envio e atualização:** é um passo **manual** e raro (região fixa; atualizar os dados OSM uma ou duas vezes por ano chega).
  1. No Mac, gerar o ficheiro com `pmtiles extract`. Ocupa poucas dezenas de MB, cabe nos cerca de 17 GB livres.
  2. `scp cascais.pmtiles deploy@178.105.35.70:/home/deploy/aecc/tiles/cascais.pmtiles.tmp`
  3. No servidor: `mv cascais.pmtiles.tmp cascais.pmtiles`. A troca é atómica, e o ETag novo faz o cliente pmtiles JS recarregar o cabeçalho (resposta 412 ao `If-Match`).
  4. Fonts e sprites: `rsync -av` da pasta preparada no Mac, uma só vez.
- **Caddy:** o bloco `aecc.salv4.com` serve a SPA em `/home/deploy/aecc/web` (`docs/native/plano-app-nativa.md:272`). Acrescentar o bloco seguinte **antes** do `handle` da SPA:
  ```
  handle_path /tiles/* {
      root * /home/deploy/aecc/tiles
      @pmtiles path *.pmtiles
      header @pmtiles Content-Type application/octet-stream
      header Cache-Control "public, max-age=86400"
      file_server
  }
  ```
  - O `file_server` responde a `Range`, `If-Match` e `If-Range` e envia `ETag` e `Last-Modified` através de `http.ServeContent` (caddy `modules/caddyhttp/fileserver/staticfiles.go`).
  - **Não** aplicar `encode` neste bloco: os tiles já vêm comprimidos e a compressão interfere com o Range.
  - Não é preciso CORS. O web é da mesma origem e o nativo não aplica CORS. Se um dia os tiles mudarem de host: `Access-Control-Allow-Methods GET,HEAD`, `Allow-Headers Range,If-Match`, `Expose-Headers ETag,Content-Range,Content-Length`, com a origem restrita.
  - Os tiles e o basemap são dados públicos do OSM e não precisam de autenticação. **Os dados das empresas só vêm do endpoint autenticado.**
  - Verificação depois de aplicar:
    - `curl -sI -H 'Range: bytes=0-126' https://aecc.salv4.com/tiles/cascais.pmtiles` tem de devolver `206`, `Content-Range` e `ETag`;
    - `curl -sI https://aecc.salv4.com/tiles/fonts/<stack>/0-255.pbf` tem de devolver `200`.

## 3. Geocodificação sem terceiros (recomendação)

**Recomendado: D1 com o dataset GISCO "postal code points" 2025** (Eurostat/Comissão Europeia), carregado numa tabela do aecc-api.

| | D1: CP local (GISCO) | D4: Nominatim local no Mac |
|---|---|---|
| Fonte | `PCODE_PT_2025_4326.geojson`: **198 408 CP7** em PT (4060 com prefixo 2750–2789) | Geofabrik `portugal-latest.osm.pbf` (428,6 MB, 2026-11-16) + `mediagis/nominatim:5.3.3` |
| Licença | **CC BY-SA 4.0**, com atribuição "© European Union - GISCO, postal code point dataset". Os termos da edição 2025 **não foram verificados**. | ODbL. |
| Precisão | Ponto por CP7. Em meio urbano, o CP7 corresponde normalmente a um troço ou lado de rua, por isso a precisão é de rua. O CP4 é a média dos CP7. | Rua ou número de porta, quando o OSM tem `addr:housenumber`. A cobertura em Cascais **não foi verificada** e é tipicamente parcial. |
| Recursos | Cerca de 200 mil linhas na BD (alguns MB). Corre no próprio servidor, sem processos novos. | A doc só dá números para o planeta; para Portugal estimam-se 10–20 GB de disco e 1–3 h (**não verificado**). Com cerca de 17 GB livres no Mac é **arriscado**. Não pode correr no servidor de 4 GB. |
| Re-geocodificação | Trivial: lookup na tabela sempre que o `PostalCode` muda, no servidor. | Obriga a manter o Nominatim vivo ou a refazer o processo à mão. |

**Excluídas:**
- GeoAPI.pt: API de terceiros.
- CTT: a base não traz coordenadas.
- `temospena/CP7`: GPL-3.0, arquivado, com proveniência fraca.
- `centraldedados/codigos_postais`: PDDL, mas sem coordenadas.
- `geocodeAsync` do expo-location: usa os geocoders da Apple e da Google.

**Ponto jurídico a levar à associação:** o ShareAlike do CC BY-SA aplica-se se distribuirmos uma base adaptada. As coordenadas mostradas a utilizadores autenticados são, em princípio, um "uso" com atribuição. Confirmar.

**Taxa de sucesso esperada:** **não medida**, porque não há moradas locais. O import já anula os CP fora do formato `^\d{4}-\d{3}$` (`aecc-api AECC.Infrastructure/Import/CompanyDataCleaner.cs:7-8,79-84`). Assume-se:
- êxito ao nível CP7 em ≥ 95 % das empresas com CP válido;
- o resto cai para CP4, se o CP4 existir no GISCO;
- os restantes ficam sem localização: CP em falta, apartados ou "grandes clientes", que o GISCO exclui.

O `--dry-run` da Tarefa A4 mede isto no servidor e devolve só contagens.

**Plano para as falhas:**
- A empresa fica com `GeoPrecision = None` e não aparece no mapa.
- O admin vê a contagem e a lista (só nomes) em Gestão → "Empresas sem localização" (A6/W7) e pode pôr coordenadas à mão (precisão `Manual`). A mesma regra de ENI aplica-se à saída.

**Re-geocodificação:**
- Hoje a morada **não é editável pela API**. `UpdateCompanyRequest` só tem `Name`, `Description`, `LeadCooldownMinutes` e `LeadDestinationEmail` (`aecc-api AECC.Application/DTOs/Companies/`), e só o `import-companies` a altera.
- O `ICompanyGeocoder` (A2) é chamado no import e em qualquer futura edição de morada. Se o `PostalCode` muda, as coordenadas são recalculadas, exceto se a precisão for `Manual`.
- Nunca se chamam terceiros.

## 4. Classificação ENI pelo NIF

**Regra legal:**
- DL 14/2013, art. 4.º: o NIF de pessoa singular tem 9 dígitos e o primeiro vai de 1 a 4; o 45 corresponde a não residentes.
- A gama 3 foi anunciada pela AT em 2019 (Portal das Finanças, "Atribuição de nova gama de NIF a pessoas singulares").
- Restantes prefixos:
  - 5: coletiva;
  - 6: administração pública;
  - 70/74/75: herança indivisa;
  - 71: não residentes coletivos;
  - 72: fundos de investimento;
  - 77: atribuição oficiosa;
  - 79: regime excecional;
  - 8: ENI, gama extinta;
  - 90/91: condomínios e sociedades irregulares;
  - 98/99.
- A tabela de prefixos só está confirmada por fonte secundária (Wikipédia PT, que cita o manual AT `Manual_Inicio_PF.pdf`).
- O dígito de controlo mod 11 também só tem fonte secundária: pesos 9..2 sobre os 8 primeiros dígitos; `r = soma % 11`; o dígito é `r < 2 ? 0 : 11 − r`.
- **Antes da Fase B, pedir à associação ou ao contabilista a confirmação da tabela na fonte AT atual.**

**Regra a implementar (fail-closed):** `IsSoleTrader` (protegido) = verdadeiro, **salvo** se o NIF for válido (9 dígitos, mod 11 correto) **e** começar por `5`, `6`, `71`, `72`, `90`, `91`, `98` ou `99`. Ficam portanto protegidos os prefixos 1–4, 70/74/75/77/78/79, o 8, os NIF em falta e os NIF inválidos.

**Qualidade dos dados atuais.** Fonte: `aecc-api/tax_id_categoria.csv`, gitignored, 1524 linhas. Só contagens:

| Prefixo | Contagem | Classe |
|---|---:|---|
| 1 | 167 | singular → protegido |
| 2 | 144 | singular → protegido |
| 3 | 11 | singular → protegido |
| 4 | 0 | n/a |
| 5 | 1190 | coletiva |
| 70 | 1 | herança indivisa → protegido |
| 74 | 4 | herança indivisa → protegido |
| 8 | 1 | ENI (extinto) → protegido |
| 90 | 6 | condomínio/soc. irregular → coletiva |

- NIF em falta: 0. Não numéricos: 0. Comprimento errado: 0. Duplicados: 0.
- **Dígito de controlo inválido: 1**, que passa a protegido.
- **Total estimado protegido: 328–329** (o NIF inválido pode coincidir com um prefixo já protegido). **Coletivas: cerca de 1195.**

## 5. API (aecc-api): tarefas A1–A6

**Contexto:**
- .NET 9, EF Core 9.0.4 + Npgsql 9.0.4, PostgreSQL 16, Clean Architecture (`AECC.Api` / `Application` / `Domain` / `Infrastructure` / `Tests`).
- As migrações aplicam-se no arranque (`AECC.Api/Program.cs:241-265`).
- Há uma única policy, `AdminOnly` (`Program.cs:210`). `CompanyOwnerHandler` só aceita o dono, sem bypass de admin (`AECC.Api/Authorization/CompanyOwnerHandler.cs:14-21`).
- Os testes de integração correm com xUnit, `WebApplicationFactory` e Testcontainers Postgres, com tokens reais (`AECC.Tests/ApiFixture.cs`, `OAuthTestHelpers.cs`).
- Os comandos CLI são intercetados em `Program.cs:33-46`.
- Não há PostGIS nem NetTopologySuite, e não é preciso acrescentá-los: a distância não se calcula no servidor.

**Branch:** `feat/mapa-api` a partir de `origin/main` do aecc-api. **1 PR.** Sem dependências NuGet novas, porque o GeoJSON lê-se com `System.Text.Json`.

### Task A1: Classificação ENI (domínio)

**Files:**
- Create: `AECC.Domain/Companies/TaxIdClassifier.cs`
- Test: `AECC.Tests/Unit/TaxIdClassifierTests.cs`

**Interfaces:**
- Produces: `public static class TaxIdClassifier { public static bool IsValid(string? taxId); public static bool IsProtectedPerson(string? taxId); }`. `IsProtectedPerson` é o "ENI derivado" da secção 4, com regra fail-closed.

- [ ] **Step 1:** Escrever o teste `[Theory]` com NIF **sintéticos**, gerados no próprio teste com o dígito de controlo calculado; não usar NIF reais.
  - `IsProtectedPerson` dá `true` para os prefixos `1,2,3,45,70,74,75,77,78,79,8`, para `null`, `""`, `"12345678"` (8 dígitos) e para um NIF de prefixo 5 com o dígito errado.
  - Dá `false` para NIF válidos com os prefixos `5,6,71,72,90,91,98,99`.
  - `IsValid` cobre o caso `r < 2 → 0`.
- [ ] **Step 2:** `dotnet test AECC.slnx --filter TaxIdClassifierTests`. Esperado: FAIL, a classe não existe.
- [ ] **Step 3:** Implementar `TaxIdClassifier` com a regra da secção 4.
- [ ] **Step 4:** Repetir o comando do Step 2. Esperado: PASS.
- [ ] **Step 5:** `git commit -m "feat(map): classificação ENI pelo NIF (fail-closed)"`

### Task A2: Tabela de códigos postais, modelo de dados e geocoder

**Files:**
- Create: `AECC.Domain/Entities/PostalCodePoint.cs`
- Create: `AECC.Domain/Enums/GeoPrecision.cs`
- Create: `AECC.Domain/Enums/GeoSource.cs`
- Modify: `AECC.Domain/Entities/Company.cs:3-37`
- Modify: `AECC.Infrastructure/Persistence/Configurations/CompanyConfiguration.cs`
- Create: `AECC.Infrastructure/Persistence/Configurations/PostalCodePointConfiguration.cs`
- Modify: `AppDbContext`
- Create: `AECC.Infrastructure/Geo/CompanyGeocoder.cs` (+ interface `AECC.Application/Interfaces/ICompanyGeocoder.cs`)
- Migration: `dotnet ef migrations add AddCompanyGeolocation`
- Test: `AECC.Tests/CompanyGeocoderTests.cs` (integração, BD real)

**Interfaces:**
- Produces:
  - `enum GeoPrecision { None = 0, PostalCode4 = 1, PostalCode7 = 2, Manual = 3 }`
  - `enum GeoSource { None = 0, Gisco = 1, Manual = 2 }`
  - `PostalCodePoint { string Code /* "NNNN-NNN", PK */; string Cp4; double Latitude; double Longitude; }`. A tabela é `postal_code_points` e tem um índice em `cp4`.
  - Novos campos de `Company`:
    - `double? Latitude`, `double? Longitude`: o ponto mais exato;
    - `double? AreaLatitude`, `double? AreaLongitude`: centróide CP4;
    - `GeoPrecision GeoPrecision`, `GeoSource GeoSource`, `DateTimeOffset? GeocodedAt`;
    - `bool IsProtectedPerson`: derivado, recalculado sempre que `TaxId` muda;
    - `bool ShowExactPin` (opt-in, default `false`);
    - `bool HiddenFromMapByOwner` (default `false`) e `bool HiddenFromMapByAdmin` (default `false`).
  - `ICompanyGeocoder.GeocodeAsync(Company c, CancellationToken ct) : Task`. Preenche os campos geo a partir de `PostalCode`:
    - CP7 encontrado: precisão CP7.
    - Senão, CP4: precisão CP4, com `Latitude = AreaLatitude`.
    - Senão: `None`.
    - Não toca numa empresa com precisão `Manual`.
    - Também atualiza `IsProtectedPerson`.

- [ ] **Step 1:** Escrever os testes, com pontos sintéticos inseridos pelo teste:
  - `Geocode_Cp7Found_SetsPostalCode7AndCp4Centroid`: o centróide é a média dos CP7 desse CP4.
  - `Geocode_OnlyCp4Known_SetsPostalCode4`.
  - `Geocode_NoPostalCode_SetsNone`.
  - `Geocode_Manual_IsNotOverwritten`.
  - `Geocode_SetsIsProtectedPersonFromTaxId`.
- [ ] **Step 2:** Correr e confirmar FAIL.
- [ ] **Step 3:** Implementar as entidades, a configuração (snake_case, com `postal_code_points.code` `char(8)`) e a migração. A migração põe `IsProtectedPerson = true` em todas as linhas existentes (fail-closed até ao primeiro `geocode-companies`).
- [ ] **Step 4:** Implementar `CompanyGeocoder` e registá-lo no DI.
- [ ] **Step 5:** Correr os testes. Esperado: PASS. Correr também `dotnet test AECC.slnx`, que tem de continuar verde.
- [ ] **Step 6:** `git commit -m "feat(map): modelo de geolocalização, tabela de CP e geocoder local"`

### Task A3: Endpoint do mapa

**Files:**
- Create: `AECC.Application/DTOs/Companies/MapCompanyDto.cs`
- Modify: `AECC.Api/Controllers/CompaniesController.cs` (nova action)
- Modify: `AECC.Infrastructure/Repositories/CompanyRepository.cs` (query `GetMapPointsAsync`)
- Test: `AECC.Tests/CompanyMapTests.cs`

**Interfaces:**
- Produces: `GET /api/companies/map?categoryId={guid?}`, com `[Authorize]`. Resposta: `MapCompanyDto[]`.
  - `record MapCompanyDto(Guid Id, string Name, Guid? CategoryId, double Lat, double Lng, string Precision)`.
  - `Precision` é `"exact"` ou `"area"`.
  - A regra é aplicada **na projeção SQL**: as colunas `latitude`/`longitude` de um protegido sem opt-in nem são lidas para fora da BD.
    ```
    exact = !IsProtectedPerson || ShowExactPin
    Lat/Lng = exact ? (Latitude, Longitude) : (AreaLatitude, AreaLongitude)
    Precision = exact && GeoPrecision >= PostalCode7 ? "exact" : "area"
    ```
  - Filtros: `IsActive`, `!HiddenFromMapByOwner`, `!HiddenFromMapByAdmin` e `GeoPrecision != None`.
  - A semântica de `categoryId` é igual à do diretório: `CategoryId ==` exato (`CompanyRepository.cs:46-47`).
  - Ordenação por `Name`. Sem paginação: cerca de 1524 × 110 B dá aproximadamente 170 KB sem compressão.

- [ ] **Step 1:** Escrever os testes. O seed cria, no próprio teste, um ponto CP7 sintético e as empresas necessárias:
  - `Map_Anonymous_Returns401`
  - `Map_Company_ReturnsExactPoint`
  - `Map_ProtectedWithoutOptIn_ReturnsAreaCentroid_NotExact`: as coordenadas são iguais às de `AreaLatitude/AreaLongitude` e diferentes das exatas.
  - `Map_ProtectedWithOptIn_ReturnsExact`
  - `Map_HiddenByOwner_Excluded`
  - `Map_HiddenByAdmin_Excluded`
  - `Map_Inactive_Excluded`
  - `Map_Unlocated_Excluded`
  - `Map_CategoryFilter_MatchesDirectorySemantics`
  - `Map_Payload_HasExactlyTheSixProperties`: o conjunto de nomes das propriedades JSON é igual a `{id,name,categoryId,lat,lng,precision}`.
  - `OtherDtos_DoNotExposeCoordinates`: o JSON de `/companies/{id}` e de `/companies/directory` não contém `latitude`, `longitude`, `isProtectedPerson` nem `showExactPin`.
- [ ] **Step 2:** Correr e confirmar FAIL.
- [ ] **Step 3:** Implementar a action, o DTO e a query.
- [ ] **Step 4:** Correr os testes. Esperado: PASS. Correr também `dotnet test AECC.slnx -c Release`.
- [ ] **Step 5:** `git commit -m "feat(map): GET /companies/map autenticado e mínimo"`

### Task A4: Comandos `import-postal-codes` e `geocode-companies`

**Files:**
- Create: `AECC.Api/Commands/ImportPostalCodesCommand.cs`
- Create: `AECC.Api/Commands/GeocodeCompaniesCommand.cs`
- Create: `AECC.Infrastructure/Import/GiscoPostalCodeReader.cs`
- Modify: `AECC.Api/Program.cs:33-46` (registo)
- Modify: `AECC.Api/Commands/ImportCompaniesCommand.cs` (chamar `ICompanyGeocoder` em cada empresa importada)
- Test: `AECC.Tests/GiscoPostalCodeReaderTests.cs` com uma fixture GeoJSON sintética de 3 features

**Interfaces:**
- Consumes: `ICompanyGeocoder` (A2) e `ProductionGuard` (como os comandos existentes).
- Produces:
  - `dotnet run --project AECC.Api -- import-postal-codes <PCODE_PT_2025_4326.geojson>`: lê em streaming e faz upsert idempotente de `postal_code_points`. Imprime `lidos/inseridos/atualizados/ignorados`.
  - `dotnet run --project AECC.Api -- geocode-companies [--dry-run]`. Imprime **só agregados**:
    - contagens por `GeoPrecision`;
    - contagem de protegidos e não protegidos;
    - top 30 CP4 por contagem;
    - número de empresas por concelho, inferido do CP4 (Cascais = 2645–2649 e 2750–2789, ou "outro");
    - bbox das coordenadas encontradas, arredondada a 2 casas.
  - Não imprime nomes, NIF nem moradas. O `--dry-run` não escreve.

- [ ] **Step 1:** Inspecionar o GeoJSON do GISCO. Contar features e ver os nomes das propriedades e o formato do código (`NNNN-NNN` ou `NNNNNNN`). Registar o resultado no PR. **Os nomes das propriedades não estão verificados.**
- [ ] **Step 2:** Escrever os testes do reader: normalização para `NNNN-NNN`, `Cp4` derivado, features sem geometria ignoradas.
- [ ] **Step 3:** Correr e confirmar FAIL.
- [ ] **Step 4:** Implementar o reader e os dois comandos (o `geocode-companies` exige `ALLOW_DESTRUCTIVE_COMMANDS` em produção, exceto no `--dry-run`).
- [ ] **Step 5:** Correr os testes. Esperado: PASS. Depois correr os dois comandos localmente sobre a BD do seed E2E. Esperado: corre sem exceções e mostra só agregados.
- [ ] **Step 6:** `git commit -m "feat(map): importação de CP (GISCO) e geocodificação em lote"`

### Task A5: Definições de mapa por empresa (dono e admin)

**Files:**
- Create: `AECC.Application/DTOs/Companies/CompanyMapSettingsDto.cs`
- Create: `UpdateCompanyMapSettingsRequest.cs` + validator
- Modify: `CompaniesController.cs`
- Test: `AECC.Tests/CompanyMapSettingsTests.cs`

**Interfaces:**
- Produces:
  - `GET /api/companies/{id}/map-settings`, só para o dono ou o Admin. Devolve `CompanyMapSettingsDto(bool IsProtectedPerson, bool ShowExactPin, bool HiddenFromMapByOwner, bool HiddenFromMapByAdmin, string Precision /* "none"|"cp4"|"cp7"|"manual" */)`.
  - `PUT /api/companies/{id}/map-settings` com `UpdateCompanyMapSettingsRequest(bool? ShowExactPin, bool? HiddenFromMapByOwner, bool? HiddenFromMapByAdmin)`.
  - O dono pode alterar `ShowExactPin` e `HiddenFromMapByOwner`.
  - O Admin pode alterar `HiddenFromMapByAdmin`. Não pode alterar `ShowExactPin`: o consentimento é do dono.
  - Um campo sem permissão dá 403. Os outros papéis recebem 403.
  - Fica de fora (não se faz agora): `PUT /api/companies/{id}/location` AdminOnly `{lat,lng}` → `GeoPrecision.Manual`. Está na A6.

- [ ] **Step 1:** Escrever os testes:
  - `Owner_CanOptInExactPin`
  - `Owner_CanHide`
  - `Admin_CanHide`
  - `Admin_CannotOptInExactPin_403`
  - `OtherAssociado_403`
  - `Cliente_403`
  - `Anonymous_401`
  - `AdminHidden_StaysHidden_WhenOwnerUnhides`: o efeito confirma-se pelo `/companies/map`.
- [ ] **Step 2:** Correr e confirmar FAIL.
- [ ] **Step 3:** Implementar. Acrescentar ao `CompanyOwnerHandler` uma variante `CompanyOwnerOrAdminRequirement`, sem mudar o comportamento atual do PUT da empresa.
- [ ] **Step 4:** Correr os testes. Esperado: PASS.
- [ ] **Step 5:** `git commit -m "feat(map): definições de mapa (opt-in pino exato, opt-out dono/admin)"`

### Task A6: Admin: empresas sem localização e coordenadas manuais

**Files:**
- Modify: `CompaniesController.cs`
- Test: `AECC.Tests/CompanyLocationAdminTests.cs`

**Interfaces:**
- Produces:
  - `GET /api/companies/unlocated` (AdminOnly) devolve `[{ id, name }]`.
  - `PUT /api/companies/{id}/location` (AdminOnly) com `{ lat: double, lng: double }` grava `GeoPrecision.Manual` e `GeoSource.Manual`. O body é validado: o ponto tem de estar dentro do bbox da secção 2.1.

- [ ] **Step 1:** Escrever os testes:
  - `Unlocated_ListsOnlyNone`
  - `Unlocated_NonAdmin_403`
  - `SetLocation_Manual_ThenMapShowsIt`
  - `SetLocation_OutOfBbox_400`
  - `SetLocation_ProtectedPerson_MapStillShowsArea`: com precisão manual, o protegido sem opt-in continua a sair com o centróide CP4.
- [ ] **Step 2:** Correr e confirmar FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr e confirmar PASS. Correr também `dotnet test AECC.slnx -c Release`, que tem de ficar verde.
- [ ] **Step 5:** Atualizar o `seed-e2e` (`AECC.Api/Commands/SeedE2eCommand.cs`) com 3 CP sintéticos e coordenadas para as empresas E2E:
  - uma coletiva;
  - uma protegida sem opt-in;
  - uma protegida escondida.
  
  O `ASSOCIADO_COMPANY_ID` (`e2e/web/helpers.ts:10`) fica como coletiva com coordenadas, e o comando `seed-e2e` continua idempotente.
- [ ] **Step 6:** `git commit -m "feat(map): empresas sem localização e coordenadas manuais (admin)"` e abrir o PR.

## 6. Tiles e estilos: tarefa T-infra (documentação do servidor + script)

### Task T1: Gerar e documentar os tiles, estilos, glyphs e sprites

**Files:**
- Create: `docs/features/mapa-servidor.md` (runbook: extract, scp, mv atómico, Caddy, verificação com `curl`, atualização anual, ATTRIBUTION.txt)
- Create: `scripts/map/build-styles.mjs`
- Create: `src/components/map/styles/mare-light.json`, `mare-dark.json` (gerados)

**Interfaces:**
- Produces:
  - `TILES_BASE_URL = 'https://aecc.salv4.com/tiles'`, em `app.config.ts` `extra.tilesUrl`, com override por `EXPO_PUBLIC_TILES_URL`.
  - Caminhos publicados:
    - `/tiles/cascais.pmtiles`
    - `/tiles/fonts/{fontstack}/{range}.pbf`
    - `/tiles/sprites/v4/{light|dark}`

- [ ] **Step 1:** Depois de a A4 estar em produção, correr no servidor `geocode-companies --dry-run` e confirmar a bbox. Ajustar o `--bbox` se houver associadas fora do concelho.
- [ ] **Step 2:** No Mac, correr `pmtiles extract …` (secção 2.1) e registar o tamanho real em `mapa-servidor.md`.
- [ ] **Step 3:** Tentar gerar os PBF da Geist com `maplibre/font-maker`; se falhar, usar Noto Sans do `basemaps-assets`. Registar o resultado.
- [ ] **Step 4:** Correr `node scripts/map/build-styles.mjs`, que gera os dois JSON a partir de `palette.ts`. A verificação é `node -e` a validar cada JSON com `@maplibre/maplibre-gl-style-spec` (vem com `maplibre-gl`). Esperado: 0 erros.
- [ ] **Step 5:** **O utilizador** aplica o upload e o bloco Caddy da secção 2.3. Verificar com os `curl` da 2.3. Esperado: `206` com `Content-Range` e `200` nos glyphs.
- [ ] **Step 6:** `git commit -m "docs(mapa): runbook de tiles e estilos Maré gerados"` (no branch da W2).

## 7. App (aecc-web): tarefas W1–W8

**Branch:** `feat/mapa-web` a partir de `origin/main`, depois de o PR da API estar em `main`. **1 PR.**

**Estrutura de ficheiros:**
```
app/(app)/(tabs)/map/_layout.tsx          Stack da tab (raiz sem header, como users/_layout.tsx)
app/(app)/(tabs)/map/index.tsx            Ecrã Mapa (estados, filtro, ficha, posição)
app/(app)/users/index.tsx                 ← movido de (tabs)/users/index.tsx (URL /users mantém-se)
app/(app)/my-companies/[id]/map.tsx       T7 "Visibilidade no mapa" (Admin; o dono também chega lá)
src/navigation/tabs.ts                    + tab map, − tab users, rótulo por papel
src/api/map.api.ts                        mapApi.companies(), companiesApi.mapSettings/updateMapSettings
src/types/api.ts                          MapCompany, MapPrecision, CompanyMapSettings
src/hooks/useMapCompanies.ts              carregamento + filtro + estados
src/hooks/useUserPosition.ts / .web.ts    pedido único de posição (expo-location / navigator.geolocation)
src/components/map/CompanyMap.tsx         nativo: MapLibre RN (Map, Camera, GeoJSONSource cluster, Layer)
src/components/map/CompanyMap.web.tsx     web: maplibre-gl + pmtiles Protocol
src/components/map/CompanyMap.types.ts    props partilhadas
src/components/map/mapStyle.ts           buildMapStyle(scheme, tilesUrl)
src/components/map/toFeatureCollection.ts
src/components/map/MapAttribution.tsx     atribuição visível (OSM · Protomaps · GISCO)
src/components/map/CompanyCard.tsx        ficha ao tocar no pino / lista de folhas do cluster
src/components/forms/MapSettingsFields.tsx toggles (Switch de @/components/ui)
```

### Task W1: Navegação: tab Mapa, Gestão, e Utilizadores fora das tabs

**Files:**
- Modify: `src/navigation/tabs.ts:13-90`
- Move: `app/(app)/(tabs)/users/index.tsx` → `app/(app)/users/index.tsx`
- Delete: `app/(app)/(tabs)/users/_layout.tsx`
- Modify: `app/(app)/_layout.tsx:24-38` (`<Stack.Screen name="users/index" options={{ title: 'Utilizadores' }} />`)
- Modify: `app/(app)/(tabs)/profile/index.tsx:84-100` (secção "UTILIZADORES" só para o Admin)
- Create: `app/(app)/(tabs)/map/_layout.tsx` + `index.tsx` provisório (`testID="map.screen"`)
- Test: `e2e/web/specs/navigation.spec.ts` (novo)

**Interfaces:**
- Produces:
  - `TabConfig.roleOverrides?: Partial<Record<UserRole, Pick<TabConfig, 'label' | 'sf' | 'md' | 'icon'>>>` e `resolveTab(tab: TabConfig, role: UserRole | undefined): TabConfig`. Ambos os layouts (`_layout.tsx:28-36` e `_layout.web.tsx:40-54`) passam a usar `resolveTab`.
  - Ordem final: `(home)`, `companies`, `map`, `my-companies`, `profile`.
  - Tab `map`: `href: '/map'`, label `'Mapa'`, `sf: 'map'`, `md: 'map'`, `icon: 'map-trifold'` (não existe hoje no `IconName`, `src/components/ui/Icon.tsx:10`; acrescentar o path Phosphor "regular" copiado como os restantes, sem dependência nova), `testID: 'tab.map'`, `managesInsets: true`, sem `roles`.
  - `profile.roleOverrides.Admin = { label: 'Gestão', sf: 'gearshape', md: 'settings', icon: 'gear-six' }` (`gear-six` também é acrescentado ao `Icon`, com path Phosphor). O `testID` continua `tab.profile`.
  - Na secção UTILIZADORES do Perfil/Gestão: `ListRow` com `testID="profile.users"`, que faz `router.push('/users')`.
  - O ecrã `users/index` mantém `testID="users.screen"`, `useRequireRole(['Admin'])` e `ForbiddenState`.
  - Como `users` deixa de ser tab, o `+native-intent.tsx:7` (`GUARDED`) deixa de o incluir. `aecc://users` abre a rota do Stack, que já mostra `state.forbidden` a quem não é Admin.

- [ ] **Step 1:** Escrever `navigation.spec.ts`:
  - o Admin vê `tab.home`, `tab.companies`, `tab.map`, `tab.my-companies` e `tab.profile` (com o texto "Gestão"), e não vê `tab.users`;
  - o Associado vê o mesmo, com "Perfil";
  - o Cliente vê `tab.home`, `tab.companies`, `tab.map` e `tab.profile`;
  - para o Admin, `tab.profile` → `profile.users` → `users.screen`, com URL `/users`;
  - `page.goto('/users/new')` como Admin mostra o formulário.

  Os testes existentes `auth.spec.ts:7,11` e `states.spec.ts:6-14` mantêm-se sem alterações e têm de continuar verdes.
- [ ] **Step 2:** `npm run test:e2e -- navigation.spec.ts`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `tabs.ts`, os dois layouts, a mudança de `users/index`, a secção UTILIZADORES e o placeholder `map`.
- [ ] **Step 4:** Correr `npm run lint && npx tsc --noEmit && npm run test:e2e`. Esperado: tudo verde.
- [ ] **Step 5:** Maestro: criar `e2e/maestro/native/gestao-utilizadores.yaml` (Admin: `tab.profile` → `profile.users` → `users.screen`). Correr também `deeplink-users-admin.yaml` e `sem-permissao-users.yaml` sem os alterar. Esperado: os 3 passam em iOS 26.3 e Android 36. Atualizar o comentário do `deeplink-users-admin.yaml`, que fala de "tab Utilizadores".
- [ ] **Step 6:** `git commit -m "feat(nav): tab Mapa, Gestão do admin e Utilizadores fora das tabs"`

### Task W2: Dependências, config e estilos

**Files:**
- Modify: `package.json` (só as dependências aprovadas da 9.1)
- Modify: `app.config.ts:45-67` (plugins `@maplibre/maplibre-react-native` e `expo-location`, `extra.tilesUrl`)
- Create: `src/components/map/mapStyle.ts`
- Create: `src/components/map/styles/*.json` (da T1)
- Test: `e2e/web/specs/map.spec.ts` (só o smoke neste passo)

**Interfaces:**
- Produces:
  - `buildMapStyle(scheme: 'light' | 'dark', tilesUrl: string): StyleSpecification`, que define:
    - `sources.protomaps = { type: 'vector', url: 'pmtiles://' + tilesUrl + '/cascais.pmtiles', attribution: '© OpenStreetMap · Protomaps' }`;
    - `glyphs = tilesUrl + '/fonts/{fontstack}/{range}.pbf'`;
    - `sprite = tilesUrl + '/sprites/v4/' + scheme`.
  - Config do plugin expo-location:
    - `locationWhenInUsePermission: 'A AECC usa a sua posição só quando toca em "A minha posição", para a mostrar no mapa. A posição não é enviada nem guardada.'`
    - `isIosBackgroundLocationEnabled: false`
    - `isAndroidBackgroundLocationEnabled: false`
    - `isAndroidForegroundServiceEnabled: false`

- [ ] **Step 1:** Instalar com `npx expo install expo-location` e `npm i -E @maplibre/maplibre-react-native@11.5.1 maplibre-gl@5.24.1 pmtiles@4.5.0`, mais `npm i -DE @protomaps/basemaps@5.7.2`. Esperado: `npx expo install --check` sem avisos.
- [ ] **Step 2:** Configurar os plugins. Correr `npx expo prebuild --clean` só num diretório temporário (o repo não versiona `ios/` nem `android/`) e confirmar que **não** aparece `ACCESS_BACKGROUND_LOCATION` no manifest nem `NSLocationAlways*` no Info.plist.
- [ ] **Step 3:** Fazer novos dev builds iOS e Android (EAS ou local, como na Fase C).
- [ ] **Step 4:** Correr `npm run lint && npx tsc --noEmit && npm run build:web`. Esperado: verde. Registar o tamanho do bundle web antes e depois, a partir do `dist/_expo/static/js/web/*.js`, em gzip.
- [ ] **Step 5:** `git commit -m "chore(map): dependências, plugins e estilo Maré do mapa"`

### Task W3: Componente `CompanyMap` (nativo + web)

**Files:**
- Create: `src/components/map/CompanyMap.types.ts`
- Create: `CompanyMap.tsx`, `CompanyMap.web.tsx`, `toFeatureCollection.ts` e `MapAttribution.tsx`

**Interfaces:**
- Consumes: `buildMapStyle` (W2) e `MapCompany` (W4).
- Produces:
  ```ts
  export interface LatLng { lat: number; lng: number }
  export interface CompanyMapProps {
    points: readonly MapCompany[];
    scheme: 'light' | 'dark';
    userPosition: LatLng | null;
    focus?: LatLng | null;                    // fly-to (ex.: ?company=)
    onSelectCompany: (id: string) => void;    // toque num pino
    onSelectGroup: (ids: string[]) => void;   // cluster no zoom máximo / folhas coincidentes
    testID?: string;
  }
  export function toFeatureCollection(points: readonly MapCompany[]): GeoJSON.FeatureCollection<GeoJSON.Point, { id: string; precision: MapPrecision }>;
  ```
  - Clusters: `cluster: true`, `clusterRadius: 50`, `clusterMaxZoom: 16`.
  - Layers:
    - `clusters` (circle `accent`);
    - `cluster-count` (symbol `onAccent`);
    - `point-exact` (circle `accent` com contorno `surface`);
    - `point-area` (circle `accentSoft` maior, com contorno `accent`, que comunica "zona aproximada");
    - `me` (circle `info`).
  - As cores vêm de `useTheme().colors` em runtime.
  - Ao tocar num cluster: se `zoom < clusterMaxZoom` e `getClusterExpansionZoom > zoom`, fazer zoom; senão, `getClusterLeaves` → `onSelectGroup`.
  - Centro inicial: o centro do bbox da 2.1, com zoom 12.
  - `MapAttribution` fica sempre visível, com `testID="map.attribution"`. Mostra "© OpenStreetMap" (link para openstreetmap.org/copyright), "Protomaps" e "Posições © EU GISCO". A atribuição nativa do MapLibre fica desligada para não duplicar.
  - No web: `maplibregl.addProtocol('pmtiles', protocol.tile)` uma só vez por módulo. A 5.x importa o CSS `maplibre-gl/dist/maplibre-gl.css` e o mapa carrega com `React.lazy` só na rota `/map`.

- [ ] **Step 1 (spike, timebox de 1 h):** No web, testar `maplibre-gl@6.18.0` no Metro (ESM e worker). Registar o resultado no PR. Se funcionar sem configuração especial, propor a subida numa tarefa separada; senão, fica a 5.24.1.
- [ ] **Step 2:** Escrever o teste em `map.spec.ts`. Como Associado, `/map` mostra `map.screen` e `map.attribution`. O canvas `.maplibregl-canvas` fica visível e pede `/tiles/cascais.pmtiles` com o header `range`, o que se verifica com `page.waitForRequest`.
- [ ] **Step 3:** Correr e confirmar FAIL.
- [ ] **Step 4:** Implementar o nativo e o web.
- [ ] **Step 5:** Correr e confirmar PASS. Correr também `lint` e `tsc`.
- [ ] **Step 6:** `git commit -m "feat(map): CompanyMap com clusters nativos (MapLibre RN / maplibre-gl + PMTiles)"`

### Task W4: Ecrã Mapa: dados, filtro, ficha e estados

**Files:**
- Create: `src/api/map.api.ts`
- Create: `src/hooks/useMapCompanies.ts`
- Create: `src/components/map/CompanyCard.tsx`
- Modify: `app/(app)/(tabs)/map/index.tsx`
- Modify: `src/types/api.ts`

**Interfaces:**
- Produces:
  - `type MapPrecision = 'exact' | 'area'`
  - `interface MapCompany { id: string; name: string; categoryId: string | null; lat: number; lng: number; precision: MapPrecision }`
  - `mapApi.companies(params?: { categoryId?: string }): Promise<MapCompany[]>` faz `GET /companies/map`.
  - `useMapCompanies({ categoryId })` devolve `{ points, loading, error, reload }`.
  - Ecrã:
    - `ListScaffold`/`Horizon` com o título "Mapa" e a meta `"{n} empresas"` (`testID="map.count"`);
    - `CategoryChips` (`src/components/directory/CategoryChips.tsx`), com os mesmos testIDs `companies.category-chip-*`;
    - o mapa ocupa o resto.
  - Estados, todos com `StateScreen`/`ErrorState`/`Skeleton` existentes:
    - `map.loading`;
    - `map.error` (com retry);
    - `map.empty`: nenhuma empresa com localização nesta categoria, com "Limpar filtro";
    - `map.card`: ficha com nome, categoria e uma nota "Localização aproximada (zona do código postal)" quando `precision === 'area'`, mais o botão "Ver empresa" (`map.card.open`, que faz `router.push('/companies/' + id)`);
    - `map.group`: lista das empresas de um cluster coincidente, cada uma a abrir o detalhe.
  - Parâmetro `?company=<id>`: foca e abre a ficha dessa empresa, se estiver no payload. Serve de caminho testável e de alvo para um futuro "Ver no mapa" no detalhe (ver secção 8).

- [ ] **Step 1:** Escrever os testes em `map.spec.ts`, com o seed E2E da A6:
  - `map.count` mostra o número de empresas visíveis;
  - escolher um chip altera a contagem;
  - uma categoria sem pontos mostra `map.empty`, e "Limpar filtro" repõe a contagem;
  - `/map?company=<ASSOCIADO_COMPANY_ID>` mostra `map.card`, e `map.card.open` leva a `/companies/<id>`;
  - a empresa protegida mostra o texto "Localização aproximada";
  - a API em erro (`page.route('**/companies/map**', r => r.abort())`) mostra `map.error`, e o retry recupera;
  - a resposta da rede ao `/companies/map` não contém a empresa escondida.
- [ ] **Step 2:** Correr e confirmar FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr e confirmar PASS. Correr também `npm run lint && npx tsc --noEmit && npm run test:e2e`.
- [ ] **Step 5:** `git commit -m "feat(map): ecrã Mapa com filtro, ficha e estados"`

### Task W5: Botão "A minha posição"

**Files:**
- Create: `src/hooks/useUserPosition.ts`, `src/hooks/useUserPosition.web.ts`
- Modify: `app/(app)/(tabs)/map/index.tsx`

**Interfaces:**
- Produces: `useUserPosition()` devolve `{ state: 'idle' | 'locating' | 'shown' | 'denied' | 'unavailable'; position: LatLng | null; request(): Promise<void>; clear(): void }`.
  - Só `request()` lê a posição. Faz um único pedido: `requestForegroundPermissionsAsync` seguido de `getCurrentPositionAsync({ accuracy: Balanced })`; no web, `navigator.geolocation.getCurrentPosition` com `maximumAge: 0` e `timeout: 10000`.
  - Sem `watchPosition`. Sem persistência: o estado vive só no componente. Nenhum pedido de rede usa a posição.
  - Botão `IconButton` com `testID="map.locate"` e `accessibilityLabel="Mostrar a minha posição"`.
  - Estado `denied`: `InlineAlert` com `testID="map.locate.denied"` e o texto "Sem acesso à localização. Pode ativá-lo nas definições do dispositivo." O mapa continua utilizável.
  - Estado `unavailable`: inclui o web sem `navigator.geolocation` e os contextos inseguros.

- [ ] **Step 1:** Escrever os testes em `map.spec.ts`:
  - com `context.grantPermissions(['geolocation'])` e `context.setGeolocation({ latitude: 38.70, longitude: -9.42 })`, tocar em `map.locate` faz aparecer `map.me`. O `map.me` é um `View` invisível de acessibilidade com o texto "A sua posição está no mapa", porque o ponto em canvas não é testável;
  - sem permissões concedidas, aparece `map.locate.denied`;
  - durante todo o teste, nenhum pedido de rede contém `38.70` nem `-9.42`, o que se verifica com `page.on('request')` sobre URL e body.
- [ ] **Step 2:** Correr e confirmar FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr e confirmar PASS.
- [ ] **Step 5:** Maestro: criar `mapa-posicao-negada.yaml` (`launchApp: { permissions: { location: deny } }` → `map.locate` → `map.locate.denied`) e `mapa-posicao.yaml` (`permissions: { location: allow }` → `map.locate` → `map.me`). Esperado: passam em iOS 26.3 e Android 36.
- [ ] **Step 6:** `git commit -m "feat(map): botão a minha posição (só a pedido, nunca enviada)"`

### Task W6: Toggles de mapa no T7 e para o Admin

**Files:**
- Create: `src/components/forms/MapSettingsFields.tsx`
- Modify: `app/(app)/my-companies/[id]/edit.tsx:123-139` (secção "MAPA" para o dono)
- Create: `app/(app)/my-companies/[id]/map.tsx` (T7 "Visibilidade no mapa", para o Admin e para o dono)
- Modify: `app/(app)/_layout.tsx` (`Stack.Screen name="my-companies/[id]/map"`)
- Modify: `app/(app)/(tabs)/companies/[id].tsx` (ação "Mapa" junto da identidade, só para o Admin)
- Modify: `src/api/companies.api.ts:12-37`

**Interfaces:**
- Consumes: `GET/PUT /companies/{id}/map-settings` (A5).
- Produces:
  - `companiesApi.mapSettings(id): Promise<CompanyMapSettings>`
  - `companiesApi.updateMapSettings(id, patch: Partial<Pick<CompanyMapSettings, 'showExactPin' | 'hiddenFromMapByOwner' | 'hiddenFromMapByAdmin'>>)`
  - `MapSettingsFields({ settings, role: 'owner' | 'admin', onChange })`, com os seguintes `Switch` (de `@/components/ui`):
    - dono: `company-edit.map-visible` ("Mostrar no mapa", que é o inverso de `hiddenFromMapByOwner`);
    - dono, só se `isProtectedPerson`: `company-edit.map-exact` ("Mostrar a morada exata no mapa"), com a explicação "Por omissão, o mapa mostra só a zona do código postal.";
    - admin: `company-map.admin-hidden` ("Esconder do mapa (administração)").
  - Se a precisão for `none`, aparece a nota "Sem localização: o código postal não foi encontrado."
  - O Admin não vê o toggle de pino exato.
  - O ecrã de edição continua a mostrar `ForbiddenState` a quem não é dono (`edit.tsx:121`). O Admin entra pelo ecrã `/my-companies/[id]/map`.

- [ ] **Step 1:** Escrever os testes em `e2e/web/specs/edit-company.spec.ts` (acrescentar):
  - o Associado desliga `company-edit.map-visible`, guarda, e em `/map` a contagem baixa 1;
  - o Admin abre `/my-companies/<id>/map`, vê `company-map.admin-hidden` e **não** vê `company-edit.map-exact`.
- [ ] **Step 2:** Correr e confirmar FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr e confirmar PASS. Correr também `npm run test:e2e` completo.
- [ ] **Step 5:** `git commit -m "feat(map): opt-in de pino exato e opt-out do mapa (dono e admin)"`

### Task W7: Gestão: empresas sem localização (Admin)

**Files:**
- Modify: `app/(app)/(tabs)/profile/index.tsx` (linha "Empresas sem localização (N)", `testID="profile.unlocated"`)
- Create: `app/(app)/companies-unlocated.tsx`

**Interfaces:**
- Consumes: `GET /companies/unlocated` e `PUT /companies/{id}/location` (A6).
- Produces: uma lista de nomes. Tocar abre um T7 com dois `TextField` (latitude, longitude) e uma validação que espelha o bbox da A6. É opcional na 1.ª entrega e pode ficar para um PR seguinte, se a A4 der poucas falhas.

- [ ] **Step 1:** Teste Playwright: o Admin vê `profile.unlocated` com a contagem do seed, e o Associado não o vê.
- [ ] **Step 2:** Correr e confirmar FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr e confirmar PASS.
- [ ] **Step 5:** Commit.

### Task W8: Maestro do mapa e fecho

**Files:**
- Create: `e2e/maestro/native/mapa.yaml`

- [ ] **Step 1:** Escrever `mapa.yaml`:
  - `_login.yaml`, depois `tab.map`, depois `map.screen`;
  - `map.attribution` visível;
  - tocar num `companies.category-chip-*`, o que altera `map.count`;
  - `aecc://map?company=<id>` → `map.card` → `map.card.open` → `company-detail.*`;
  - `takeScreenshot` nos temas claro e escuro.
- [ ] **Step 2:** Correr em iOS 26.3 e Android 36. Esperado: PASS.
- [ ] **Step 3:** Correr a bateria completa: `npm run lint && npx tsc --noEmit && npm run test:e2e`, mais todos os fluxos Maestro. Esperado: tudo verde.
- [ ] **Step 4:** Commit e PR.

## 8. Pontos RGPD a levar à associação (não implementar agora)

1. **A API expõe moradas sem autenticação.**
   - `GET /api/companies`, `GET /api/companies/directory` e `GET /api/companies/{id}` não têm `[Authorize]` (`aecc-api AECC.Api/Controllers/CompaniesController.cs:21,31,66`).
   - O `CompanyDirectoryDto` inclui `Address`, `Locality`, `PostalCode` e `PostalCodeLocality` para todas as empresas, incluindo as cerca de 329 protegidas (`CompanyDirectoryDto.cs:6-20`).
   - Na app, o diretório só existe com sessão, mas a API não. **Recomendação:** pôr `[Authorize]` nestes três endpoints, para alinhar com a decisão "só autenticados". É uma alteração pequena, mas fora deste âmbito; decidir.
2. **O diretório e o detalhe devem continuar a mostrar a morada completa dos ENI?** Hoje mostram-na (`app/(app)/(tabs)/companies/[id].tsx:181-228`). Seria incoerente esconder o pino exato no mapa e mostrar a morada no detalhe. Opções:
   - (a) aplicar o mesmo opt-in à morada no detalhe e no diretório (mostrar só a localidade e o CP4);
   - (b) manter como está, com base legal explícita.
3. **"Ver no mapa" envia a morada à Google.**
   - O detalhe abre `https://www.google.com/maps/search/?api=1&query=<morada>` (`src/utils/text.ts:65`, usado em `companies/[id].tsx:226`). A ação é iniciada pelo utilizador, mas contradiz o espírito de "nenhum fornecedor externo".
   - **Proposta:** trocar por `/map?company=<id>`, que já fica suportado pela W4. Decidir.
4. **Não há política de privacidade.** Não existe em nenhum dos repos: não há rota no aecc-web, texto, termos nem campo de consentimento no aecc-api (o OpenIddict usa `ConsentTypes.Implicit`, `OpenIddictSeeder.cs:57,94`). É preciso:
   - **uma política de privacidade**, com rota pública `/privacy` no aecc-web, ligada do login e do Perfil, a redigir com o apoio jurídico;
   - **um texto curto de informação no ecrã Mapa**. Proposta: "As empresas aparecem pela morada; empresários em nome individual aparecem só pela zona do código postal, salvo se escolherem o contrário. Qualquer empresa pode sair do mapa. A sua posição só é usada no seu dispositivo, quando toca em 'A minha posição'." A rever juridicamente.
5. **Atribuição GISCO (CC BY-SA 4.0):** confirmar o ShareAlike (secção 3) e a menção na política de privacidade, como origem dos dados de localização.
6. **Heranças indivisas (70/74/75) e condomínios (90/91):** a regra proposta protege as heranças e trata os condomínios como coletivas. Confirmar.

## 9. Execução, dependências e riscos

### 9.1 Dependências a aprovar (versões exatas)

| Pacote | Versão | Onde | Porquê |
|---|---|---|---|
| `@maplibre/maplibre-react-native` | **11.5.1** | aecc-web, dep | mapa iOS/Android, PMTiles, clusters |
| `maplibre-gl` | **5.24.1** | aecc-web, dep | mapa web (a 6.18.0 fica dependente do spike W3) |
| `pmtiles` | **4.5.0** | aecc-web, dep | protocolo `pmtiles://` no web |
| `expo-location` | **~55.1.15** (`npx expo install`) | aecc-web, dep | posição a pedido |
| `@protomaps/basemaps` | **5.7.2** | aecc-web, devDep | gerar os estilos Maré (só o script) |
| go-pmtiles CLI | v1.31.2 | Mac, ferramenta | `pmtiles extract` (não entra no projeto) |
| maplibre/font-maker | n/a | Mac, ferramenta, opcional | glyphs Geist |
| aecc-api | **nenhuma** | | `System.Text.Json` + EF Core já existentes |

### 9.2 Ordem e gates
1. **PR aecc-api** (A1–A6). Gate: `dotnet test AECC.slnx -c Release` verde. Depois do deploy, correr `import-postal-codes` e `geocode-companies --dry-run` no servidor. Só os agregados entram no PR.
2. **Infra** (T1): tiles, glyphs e sprites carregados, e bloco Caddy aplicado pelo utilizador. Gate: os `curl` da 2.3.
3. **PR aecc-web** (W1–W8). Gate por tarefa: `npm run lint`, `npx tsc --noEmit` e `npm run test:e2e`. Os fluxos Maestro correm em iOS e Android. **Atenção:** o CI do web corre contra `aecc-api:latest`, por isso o PR da API tem de estar publicado primeiro (`.github/workflows/deploy.yml:7-10`).

### 9.3 Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Bundle web: maplibre-gl tem cerca de 276 KB gzip (v5); a v6 tem cerca de 296 KB mais um worker de 147 KB | first load mais pesado | `React.lazy` só na rota `/map`; medir em W2 Step 4. A divisão de bundles com `output: 'single'` no Metro web **não está verificada**. Se não houver split, fica a 5.x e regista-se o custo. |
| v6 no Metro web (só ESM, worker por URL, WebGL2) | o mapa web não carrega | ficar na 5.24.1; spike com timebox (W3 Step 1) |
| 1524 pontos | desempenho | clustering nativo em GeoJSON e layers (nada de `Marker` React por pino); payload de cerca de 170 KB, comprimido pelo Caddy |
| Muitos ENI no mesmo centróide CP4 | cluster "impossível de abrir" | `onSelectGroup` com lista (Review Focus 1) |
| Servidor de 4 GB | memória | só ficheiros estáticos no Caddy e cerca de 200 mil linhas no Postgres; sem processos novos; disco de 15–50 MB (a medir) |
| Disco do Mac (cerca de 17 GB) | Nominatim inviável | D1 não precisa de import pesado; `pmtiles extract` lê ranges remotos e gera um ficheiro de dezenas de MB |
| Proveniência e cobertura do GISCO (licença 2025 e nomes das propriedades não verificados; apartados excluídos) | falhas de geocodificação | dry-run com agregados antes de ativar; fallback CP4; revisão manual pelo admin (A6/W7) |
| Tabela de prefixos NIF só com fonte secundária | classificação errada | regra fail-closed; confirmar na fonte AT antes da Fase B |
| PMTiles nativo sem cache | mais pedidos ao servidor | `Cache-Control` e `ETag`; região pequena |
| O manifest do MapLibre RN declara permissões de localização | perceção de "biblioteca lê a posição" | não usar `UserLocation`, `useCurrentPosition` nem `trackUserLocation`; verificar no prebuild (W2 Step 2) que não há background |
| Admin sem permissão de edição hoje (`CompanyOwnerHandler.cs:14-21`) | toggles do admin | requirement novo só para `map-settings` (A5); o PUT da empresa fica igual |
| Acoplamento do CI do web a `aecc-api:latest` | gate vermelho | ordem API → web (9.2) |
