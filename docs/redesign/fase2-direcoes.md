# Fase 2 — Três direções visuais para o Diretório (`/companies`, T3 Lista)

**Data:** 2026-11-15 · **Branch:** `design/fase2-direcoes` (worktree `.claude/worktrees/fase2-direcoes`, a partir de `origin/main` @ `13f7265`)
**Estado:** Fase A concluída (só leitura + este documento). **A aguardar aprovação** das direções e das dependências da §6 antes da Fase B.
**Natureza:** protótipo. Nada disto vai para o `main`.

> ⚠️ **A skill `design-taste-frontend-v1` não foi carregada.** Está configurada com `disable-model-invocation`, por isso o modelo não a consegue invocar: a ferramenta recusa e manda pedir ao utilizador que a corra. As direções, as paletas e a lista de clichés (§5) foram escritas com critério próprio, e o workflow da skill não foi replicado. **Antes de aprovar, correr `/design-taste-frontend-v1` sobre este ficheiro** para que seja a skill a decidir o visual estático, como pede o `CLAUDE.md`.

---

## 1. Ponto de partida (lido nesta fase)

- **Inventário** (`docs/redesign/00-inventario.md`): o Diretório é `app/(app)/companies/index.tsx` + `CompanyDirectoryList` (pesquisa, chips de categoria, lista paginada, L/V/E). O card de empresa tem 3 variantes duplicadas (D4) e o vidro está copiado inline em 5 ficheiros (D8).
- **Tokens atuais** (`src/theme/`): creme quente + navy (light) e navy-black com o dourado a liderar (dark). Vidro "seamless" = `BlurView` + tint + borda de 1px + sombra (`glass.ts`, 5 variantes × 6 props). Escala de espaçamento não linear (2…40), com raios de 4 a 28 e `glassRadius` de 14/20.
- **Logo** (`assets/brand/aecc-logo.webp`, 239×100): lockup horizontal composto por uma fita/onda multicolor (dourado, vermelho, verde, azul) à esquerda e pelo nome por extenso em 4 linhas, em navy, à direita. **Lacunas:** não existe versão do símbolo isolado, não existe versão com wordmark claro para fundos escuros e não existe vetor. O wordmark navy sobre o dark tem contraste insuficiente, por isso as três direções tratam o logo em dark de forma explícita (ver cada direção).
- **Fontes atuais:** `assets/fonts/LibreFranklin-Variable.ttf` e `SourceSans3-Variable.ttf`. Por causa da suspeita sobre o ecrã branco no Android, **as três direções usam apenas ficheiros estáticos (um TTF por peso)**.

---

## 2. Liquid Glass e navegação nativa no SDK 55 (verificação)

Fontes: `node_modules/expo/bundledNativeModules.json` do SDK 55 instalado (`expo@55.0.32`, `expo-router@55.0.18`, no worktree `expo-sdk-55`); o pacote publicado `expo-glass-effect@55.0.11` (código-fonte TS e Swift inspecionados via `npm pack`, **sem instalar**); `expo-router/build/native-tabs/*`; e as skills do plugin Expo 1.13.9, `expo-native-ui/references/visual-effects.md` e `expo-router/references/tabs.md`.

> Nota: o `node_modules` do checkout principal continua no SDK 52 (`expo@52.0.49`), apesar de o `package.json` já declarar `~55.0.32`. Antes da Fase B é preciso correr `npm ci` no worktree.

| Item | Pacote / import | Versão (bundledNativeModules SDK 55) | Estado da API | iOS 26+ | iOS < 26 | Android | Web |
|---|---|---|---|---|---|---|---|
| **GlassView**, **GlassContainer**, `isLiquidGlassAvailable()`, `isGlassEffectAPIAvailable()` | `expo-glass-effect` | `~55.0.11` | **Estável** (sem prefixo `unstable`). Props: `glassEffectStyle: 'regular' \| 'clear' \| 'none'`, `tintColor`, `isInteractive`, `colorScheme` | `UIGlassEffect` nativo. Requer compilação com Xcode 26 (`#if compiler(>=6.2)`) e `UIDesignRequiresCompatibility` ausente ou `false` no Info.plist (hoje não está definido em `ios/`) | Pod com mínimo iOS 15.1. O `GlassView` monta uma view nativa **sem efeito** (fica transparente) e `isLiquidGlassAvailable()` devolve `false`. **Não há fallback automático**: o fallback tem de ser nosso | `expo-module.config.json` declara `platforms: ["apple"]`, sem módulo Android. `GlassView.tsx` = `<View {...props} />` simples | O mesmo `<View>` simples, sem blur |
| **NativeTabs** | `expo-router/unstable-native-tabs` | vem com `expo-router ~55.0.18` | **Unstable** (o próprio caminho de import diz isso) | Tab bar Liquid Glass automática, `minimizeBehavior="onScrollDown"`, `NativeTabs.BottomAccessory`, `role="search"` | `UITabBar` clássico (via `react-native-screens ~4.23.0`) | Material 3 bottom navigation, **máximo 5 tabs** (a app tem 6 com visibilidade por papel: conflito a resolver na Fase 3). Ícones Android via prop `md` | `NativeTabsView.web.js` usa `@radix-ui/react-tabs` (básico). A skill recomenda um `_layout.web.tsx` com tabs headless (`expo-router/ui`) |
| Vidro em sheets | `Stack.Screen presentation="formSheet"` + `contentStyle: { backgroundColor: 'transparent' }` | `expo-router` | estável | Fundo Liquid Glass | sheet normal | sheet Material | modal web |
| Barra de pesquisa nativa | `Stack.SearchBar` / `headerSearchBarOptions` | `expo-router` | estável | `UISearchController` com vidro | idem, sem vidro | campo de pesquisa na toolbar | sem equivalente nativo |
| Ícones nativos | `expo-symbols` (`SymbolView`) | `~55.0.9` | estável | SF Symbols | SF Symbols | **só Apple**: precisa de fonte Material | não |
| Controlos nativos | `@expo/ui` | `~55.0.17` | a skill indica Expo Go só a partir do SDK 56. No 55 obriga a dev build | SwiftUI | SwiftUI | Compose | parcial |
| Blur (atual, D8) | `expo-blur` | `~55.0.18` | estável | `UIVisualEffectView` | idem | experimental | `backdrop-filter` |

**Regras de uso** (skill `expo-native-ui`, visual-effects):
- Só usar `GlassView` se `isLiquidGlassAvailable() && isGlassEffectAPIAvailable()` (algumas betas do iOS 26 não têm a API e crasham sem a segunda verificação).
- Com **Reduce Transparency** (`AccessibilityInfo.isReduceTransparencyEnabled()`), não usar nem vidro nem blur: superfície sólida.
- Nunca pôr `overflow: 'hidden'` num `GlassView` nem nos seus antecessores (corta o rim e o "bulge"). Usar `borderRadius` + `borderCurve: 'continuous'`.
- `isInteractive` só em controlos. Nunca animar a opacidade de um `GlassView` (o motion fica fora desta fase de qualquer forma).
- Sombras com `boxShadow` (CSS-like) e nunca `shadow*` nem `elevation`.

**Consequência para o protótipo:** cada direção define um `Surface` de protótipo com três ramos: **iOS 26 → `GlassView`**, **iOS < 26 / Reduce Transparency → superfície sólida da paleta**, **web → aproximação CSS-like** (tint semi-opaco + `backdropFilter: 'blur(…) saturate(…)'` + `boxShadow` com highlight `inset`, a validar no RNW na Fase B; se o RNW não passar `backdropFilter`, fica sólido). O `BlurView` não é usado em nenhuma direção.
**NativeTabs fica fora do protótipo:** a rota de protótipo vive fora de `(app)` e a troca de navegação é uma decisão de layout para a Fase 3. As direções descrevem como o tab bar se comporta, mas não o implementam.

---

## 3. As três direções em resumo

| | **A · Vitrine** | **B · Maré** | **C · Índice** |
|---|---|---|---|
| Conceito | Montra luminosa: as empresas são o produto e o logo de cada uma é o herói | Noite atlântica: imersiva, dark-first, com o vidro como material protagonista | Caderno de referência: denso, tipográfico, só com hairlines, ao estilo de uma ferramenta |
| Referência de espírito | Headspace / Claude (calor, serifa, generosidade) | Spotify (energia, escuro, escala de tipo grande) | Notion (estrutura, texto, contenção) |
| Modo âncora | light | **dark** | light |
| Densidade | média-baixa | média | **alta** |
| Vidro | só no cromado (pesquisa fixa, tab bar) | cromado **e** conteúdo de destaque | só o nativo (tab bar e header) |
| Tipografia | serifa display + sans humanista | grotesca expressiva + grotesca neutra | sans + mono |

---

## 4. Direções

### A · Vitrine

**Conceito:** uma montra luminosa em papel quente onde cada empresa associada aparece como um produto na prateleira: o logo dela em destaque, a AECC em segundo plano.

#### Paleta

| Papel | Light | Dark | Notas |
|---|---|---|---|
| `bg` (fundo da app) | `#FBF8F2` | `#0F1418` | light = papel quente; dark = grafite quente, **não navy** (o navy fica para as ações) |
| `surface` (cards) | `#FFFFFF` | `#182027` | |
| `sunken` (campo, skeleton) | `#F2EDE3` | `#0B0F12` | |
| `border` (hairline) | `#E6DFD2` | `#263039` | |
| `text` | `#0E2433` | `#F3EFE7` | 15,0:1 / 16,2:1 |
| `text2` | `#556270` | `#A9B2BB` | 6,2:1 / 7,7:1 |
| `text3` | `#646F7B` | `#7D8790` | 4,8:1 / 5,1:1 |
| `primary` (ações, links, foco) | `#134D6F` | `#7FB6D6` | navy da marca. Em dark passa a navy clareado (8,4:1) |
| `primaryPressed` | `#0E3B56` | `#A3CBE2` | |
| `gold` (marcador: chip ativo, selo "benefício") | `#EDB12D` | `#F0BC45` | só como **preenchimento**, nunca como texto sobre claro |
| `onGold` | `#0E2433` | `#1A1404` | 8,3:1 / 10,5:1 |
| `goldText` (texto dourado sobre claro) | `#8A5F0A` | `#F0BC45` | 5,6:1 |
| `logoPlate` (fundo dos logos das empresas) | `#FFFFFF` | `#F3EFE7` | os logos de terceiros precisam sempre de fundo claro |
| `error` / `errorBg` | `#C4302E` / `#FBE9E8` | `#F07A77` / `#2A1615` | **só estados** |
| `success` / `successBg` | `#0E7D46` / `#E5F4EC` | `#3FBF7F` / `#10261B` | só estados |
| `info` / `infoBg` | `#2479A8` / `#E6F1F8` | `#6BB5DE` / `#0F2433` | só estados |

#### Tipografia (estática)

- **Display:** *Young Serif* Regular 400 (um único ficheiro estático). Serifa de contraste baixo, quente e com carácter. Só para títulos de ecrã e nomes de destaque.
- **Texto e UI:** *Figtree* estática 400 / 500 / 600 / 700 (4 TTF).
- **Escala:** `display 34/38` · `title 26/30` · `heading 20/26` · `body-lg 17/24` · `body 15/22` · `label 13/18 (600)` · `caption 12/16`. Os números usam `tabular-nums`.
- Tracking: display −0,5; labels +0,2.

#### Superfícies e material

- **iOS 26:** `GlassView regular` só no **campo de pesquisa fixo** (que flutua sobre a lista ao fazer scroll) e, na Fase 3, no tab bar nativo. Os cards são sólidos (`surface`) e **não** levam vidro: o vidro serve para orientar e não para decorar.
- **iOS < 26:** pesquisa sólida `surface` + hairline `border`.
- **Web:** pesquisa com `backgroundColor: rgba(255,255,255,0.72)` / `rgba(24,32,39,0.72)`, `backdropFilter: blur(20px) saturate(160%)`, hairline e `boxShadow: inset 0 1px 0 rgba(255,255,255,0.6)`. Hover (só web): o card sobe 1px de hairline para `text3` e não usa sombra.
- **Android (nota):** pesquisa sólida `surface` com elevação tonal Material (`surfaceContainerHigh`) e ripple.

#### Forma

- **Densidade:** média-baixa. Card de empresa com 96px de altura no mobile e margens laterais de 20.
- **Raios:** card 18, pesquisa 14, chip 10 (**não** pill), logo-plate 12, sempre com `borderCurve: 'continuous'`.
- **Sombras:** nenhuma nos cards em light (hairline `border`). O campo flutuante leva `boxShadow: 0 8px 24px rgba(14,36,51,0.08)`.
- **Iconografia:** Phosphor *regular* (traço 1,5, 20px). Os paths ficam no protótipo e são diferentes dos *fill* do `Icon.tsx` atual.
- **Logo AECC:** lockup completo pequeno (altura 28) no topo do ecrã em light. Em dark vai sobre um "plate" `logoPlate` com raio 8 (o wordmark navy não lê sobre grafite). **Pedido de asset:** versão com wordmark claro.

#### Diretório

1. **Cabeçalho:** logo AECC pequeno à esquerda e, por baixo, o título em serifa "Diretório" (display) com a contagem "248 empresas associadas" (`text2`).
2. **Pesquisa:** campo de 52px com ícone de lupa e placeholder "Procurar empresa, serviço ou localidade". Fixa no topo ao fazer scroll (vidro no iOS 26).
3. **Chips de categoria:** linha horizontal com scroll. Inativo = `surface` + hairline; ativo = preenchimento `gold` + `onGold`. O primeiro chip é "Todas".
4. **Faixa "Em destaque":** carrossel horizontal com 3 cards largos (280×200): logo grande no plate, nome em Figtree 600 e selo dourado "−10% para associados". Só aparece quando não há pesquisa ativa.
5. **Lista:** card por empresa com logo 64×64 no plate, nome (`body-lg 600`), "Categoria · Localidade" (`text2`), selo de benefício opcional e chevron. **Web 1280:** grelha de 2 colunas, máx. 1120px, com os destaques em linha.
6. **Loading:** skeleton com a mesma geometria do card (plate e duas barras) em `sunken`, estático (motion fora da fase).
7. **Vazio:** frase em serifa "Nada com «xyz» por aqui." + subtexto + botão secundário "Limpar filtros".
8. **Erro:** card `errorBg` com ícone, "Não foi possível carregar o diretório." e botão "Tentar novamente" (`primary`).

---

### B · Maré

**Conceito:** o diretório como uma noite à beira-mar em Cascais: um navy profundo e imersivo onde o vidro flutua sobre "horizontes" de cor e o dourado é a luz que marca o que importa.

#### Paleta

| Papel | Dark (âncora) | Light | Notas |
|---|---|---|---|
| `bg` | `#071A26` | `#EAF1F5` | dark = navy-noite derivado de #134d6f; light = névoa fria |
| `horizon` (faixa de cor no topo, por trás do vidro) | `#0D3550` | `#CFE0EA` | dá ao vidro algo para refratar, sem gradiente |
| `surface` | `#0E2A3B` | `#FFFFFF` | |
| `raised` | `#133548` | `#F5F9FB` | |
| `border` | `#22404F` | `#D3E0E8` | |
| `text` | `#EEF4F7` | `#082231` | 16,0:1 / 14,3:1 |
| `text2` | `#9DB6C4` | `#46606F` | 7,0:1 / 6,6:1 |
| `text3` | `#6E8B9B` | `#566E7E` | 4,9:1 / 4,7:1 |
| `accent` (CTA, chip ativo, foco) | `#EDB12D` | `#134D6F` | dark lidera com dourado; light lidera com navy |
| `onAccent` | `#0A1B26` | `#FFFFFF` | 9,1:1 / 9,1:1 |
| `gold` (selos, em light) | `#EDB12D` | `#EDB12D` + texto `#082231` | |
| `link` | `#5FA8D3` | `#134D6F` | 6,8:1 |
| `logoPlate` | `#F5F9FB` | `#FFFFFF` | |
| `error` / `errorBg` | `#FF7A73` / `#3A1715` | `#C4302E` / `#FBE9E8` | só estados |
| `success` / `successBg` | `#34C27E` / `#0D2E20` | `#0E7D46` / `#E5F4EC` | só estados |
| `info` / `infoBg` | `#66B8E6` / `#0D2C40` | `#2479A8` / `#E6F1F8` | só estados |

#### Tipografia (estática)

- **Display:** *Bricolage Grotesque* estática 700 / 800 (instâncias estáticas da família do Google Fonts). Grotesca com personalidade e terminais vivos, usada em tamanho grande e apertado.
- **Texto e UI:** *Hanken Grotesk* estática 400 / 500 / 600.
- **Escala:** `hero 40/42 (800, tracking −1)` · `title 30/34 (700)` · `heading 22/28` · `body-lg 17/24` · `body 15/22` · `label 13/18 (600, +0,3)` · `caption 12/16`.

#### Superfícies e material

- **iOS 26:** vidro em todo o cromado (pesquisa em cápsula, chips em `GlassContainer` com `spacing` para fundirem, tab bar nativo) **e** nos cards "Em destaque", que flutuam sobre o `horizon`. Na lista principal os cards são sólidos (`surface`) para manter a legibilidade. Chip ativo = `GlassView` com `tintColor` dourado e `isInteractive`.
- **iOS < 26:** cápsulas e chips sólidos `raised`; cards de destaque `surface` com hairline.
- **Web:** `rgba(14,42,59,0.55)` (dark) / `rgba(255,255,255,0.6)` (light) + `backdropFilter: blur(24px) saturate(180%)`, hairline `rgba(255,255,255,0.12)` e `boxShadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 32px rgba(0,0,0,0.35)`. Hover: tint +6% de opacidade.
- **Android (nota):** superfícies tonais Material 3 sobre `bg`, com o chip ativo `secondaryContainer` dourado. Sem vidro.

#### Forma

- **Densidade:** média, com espaçamentos generosos entre secções (32–40) e compactos dentro delas.
- **Raios:** painéis 24, cards 20, **chips e pesquisa em cápsula** (coerente com a geometria Liquid Glass), logo-plate 14, sempre com `continuous`.
- **Sombras:** só no web (para simular a profundidade do vidro); no iOS a profundidade vem do material.
- **Iconografia:** Phosphor *bold* (traço 2, 20–22px), mais peso para acompanhar o display grosso.
- **Logo AECC:** em dark, dentro de um plate de vidro claro (`logoPlate` a 92%) com raio 12, no canto superior. Em light fica direto sobre o `horizon`. O hero tipográfico substitui a função do logo no topo ("a montra é das empresas").

#### Diretório

1. **Horizonte:** faixa `horizon` com 240px de altura no topo, com o hero "Quem faz Cascais" (display 40) e a contagem "248 associadas · 14 categorias".
2. **Pesquisa em cápsula** de vidro, a sobrepor a borda inferior do horizonte (metade dentro, metade fora).
3. **Chips em cápsula de vidro** fundidos num `GlassContainer`; o ativo é dourado.
4. **"Em destaque":** 2 cards de vidro grandes, lado a lado no web e em carrossel no mobile, com o logo no plate, o nome em display 22 e o benefício em dourado.
5. **Lista:** linhas-card sólidas (`surface`, raio 20) com plate 56, nome, "Categoria · Localidade" e, à direita, uma pílula de benefício. **Web 1280:** layout em 2 colunas: **as categorias passam a uma coluna lateral vertical** (240px, com contagens) em vez da linha de chips, e a lista ocupa 2 colunas de cards à direita.
6. **Loading:** cards `raised` com barras `border`, estáticos.
7. **Vazio:** ícone grande em traço sobre o horizonte, "Sem marés para «xyz»." e botão de vidro "Limpar filtros".
8. **Erro:** painel `errorBg` com raio 20, mensagem e botão `accent` "Tentar novamente".

---

### C · Índice

**Conceito:** o diretório como um índice de referência bem composto: tipografia e hairlines fazem todo o trabalho, a informação é densa e escaneável, e o dourado aparece só como marcador de página.

#### Paleta

| Papel | Light (âncora) | Dark | Notas |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#121416` | neutro, quase sem matiz |
| `sunken` (campo, linhas hover, cabeçalho de tabela) | `#F6F6F3` | `#0C0D0F` | |
| `surface` (popovers) | `#FFFFFF` | `#1A1D20` | |
| `border` (hairline) | `#E8E6E1` | `#2A2E33` | |
| `borderStrong` | `#CFCBC2` | `#3A3F45` | separadores de letra |
| `text` | `#16191C` | `#ECECE9` | 17,7:1 / 15,6:1. Quase preto, **não** navy |
| `text2` | `#5D6268` | `#A3A8AE` | 6,2:1 / 7,1:1 |
| `text3` (metadados mono) | `#6F7479` | `#80858B` | 4,7:1 / 5,0:1 |
| `primary` (links, seleção, foco) | `#134D6F` | `#8CC0DE` | 9,1:1 / 9,4:1 |
| `marker` (barra de 3px, letra do índice, tab ativa) | `#EDB12D` | `#EDB12D` | só como forma, nunca como texto sobre claro |
| `highlight` (match da pesquisa, selo benefício) | `#FCEFC7` + texto `#8A5F0A` | `#3A2E10` + texto `#F2C85A` | 4,9:1 / 8,4:1 |
| `error` | `#C4302E` | `#F07A77` | só estados, como barra lateral e texto |
| `success` | `#0E7D46` | `#3FBF7F` | só estados |
| `info` | `#2479A8` | `#6BB5DE` | só estados |

#### Tipografia (estática)

- **Texto e UI:** *IBM Plex Sans* estática 400 / 500 / 600.
- **Metadados:** *IBM Plex Mono* estática 400 (contagens, localidade, letra do índice, estados).
- **Escala** (compacta): `title 28/32 (600, −0,4)` · `heading 18/24` · `body 15/22` · `row 15/20 (500)` · `meta 12/16 mono` · `label 12/16 (600, maiúsculas +0,6)`.

#### Superfícies e material

- **iOS 26:** **só o vidro do sistema**, ou seja, o tab bar nativo e o header de navegação transparente sobre o scroll (na Fase 3, `Stack` com `headerTransparent` e eventualmente `Stack.SearchBar`). No protótipo, o cabeçalho fixo (título + pesquisa) é um `GlassView regular` de largura total. O conteúdo não leva vidro.
- **iOS < 26:** cabeçalho `bg` sólido com hairline inferior.
- **Web:** cabeçalho fixo `rgba(255,255,255,0.8)` / `rgba(18,20,22,0.8)` + `backdropFilter: blur(16px)` + hairline. Hover na linha: `sunken`. Foco visível de 2px `primary`.
- **Android (nota):** top app bar Material "small" com `surface` e a lista com dividers Material. É a direção que mais naturalmente se aproxima de M3.

#### Forma

- **Densidade:** alta. Linha de 60px no mobile e 44px na tabela web.
- **Raios:** 6 em controlos, 0 nas linhas, 4 no logo (quadrado discreto, 32px).
- **Sombras:** nenhuma. Toda a hierarquia vem de peso, cor de texto e hairlines.
- **Iconografia:** Phosphor *regular* a 16–18px, só onde é funcional (lupa, chevron, aviso). As categorias **não** levam ícone.
- **Logo AECC:** fora do ecrã de lista (vive no ecrã Início e no ecrã de login). No Diretório, a identidade vem do marcador dourado e da tipografia. Em web 1280 aparece pequeno (altura 24) no canto do cabeçalho, sobre `bg` claro. Em dark é substituído pelo texto "AECC" em Plex Sans 600 até existir a versão clara.

#### Diretório

1. **Cabeçalho fixo:** "Diretório" (title) + "248 empresas" em mono `text3`. Por baixo, a pesquisa plana `sunken` com raio 6 e o atalho "/" visível só no web.
2. **Categorias como tabs de texto** com contagem mono ("Restauração 42"). A ativa leva sublinhado `marker` de 3px. Scroll horizontal no mobile.
3. **Lista indexada A–Z:** separadores de letra em mono, com a letra num quadrado `marker` de 20px. Linhas com logo 32, nome (`row`) e, numa segunda linha, "Categoria · Localidade" em mono `text3`. O selo de benefício é `highlight` inline. **Web 1280:** **tabela verdadeira** com colunas Empresa / Categoria / Localidade / Benefício, cabeçalho de colunas fixo e índice A–Z vertical clicável à direita.
4. **Pesquisa ativa:** o termo é destacado nos nomes com `highlight`.
5. **Loading:** 8 linhas com hairlines e barras `sunken` de larguras variadas (não idênticas).
6. **Vazio:** texto simples "Nenhuma empresa corresponde a «xyz» em Restauração." + links "Limpar pesquisa" · "Ver todas as categorias".
7. **Erro:** linha-banner com barra lateral `error` de 3px, mensagem e link "Tentar novamente". Sem ilustração.

---

## 5. Clichés a evitar e como cada direção os evita

> Lista escrita com critério próprio, **sem** a skill `design-taste-frontend-v1` (ver aviso no topo). Deve ser revista pela skill.

| # | Cliché | A · Vitrine | B · Maré | C · Índice |
|---|---|---|---|---|
| 1 | Glassmorphism em todo o lado (blur em cada card) | vidro só na pesquisa fixa | vidro em cromado e destaques; **a lista é sólida** | vidro só no header do sistema |
| 2 | Gradiente azul→roxo / mesh no hero | sem gradientes | faixa `horizon` sólida, sem gradiente | sem gradientes |
| 3 | Inter/Roboto/system por omissão | Young Serif + Figtree | Bricolage + Hanken | Plex Sans + Plex Mono (o par sans/mono é a identidade) |
| 4 | Tudo pill com `rounded-2xl` uniforme | raios diferenciados (18/14/10); chips **não** pill | cápsula **só** onde é geometria Liquid Glass | raios 6/0, quase quadrado |
| 5 | Grelha de 3 cards iguais | carrossel + grelha de 2 colunas assimétrica | sidebar + 2 colunas no web | tabela, sem cards |
| 6 | Ícone dentro de um círculo colorido por categoria | categorias só em texto nos chips | categorias com contagem na sidebar | categorias sem ícone |
| 7 | Sombras genéricas difusas em tudo | hairlines; sombra só no elemento flutuante | sem sombra no nativo | zero sombras |
| 8 | Cor de estado usada como decoração | vermelho, verde e azul só em estados | idem | idem |
| 9 | Dourado como texto sobre claro (contraste 1,9:1) | dourado só como preenchimento; texto em `#8A5F0A` | idem | dourado só como forma (marcador) |
| 10 | Dark mode = light invertido com navy azulado | dark grafite quente, navy só nas ações | dark é o modo âncora e foi desenhado primeiro | dark neutro quase sem matiz |
| 11 | Skeletons cinzentos idênticos com shimmer | skeleton com a geometria do card | idem, em `raised` | barras com larguras variadas, sem shimmer (motion fora da fase) |
| 12 | Estado vazio com ilustração genérica e "Oops!" | frase em serifa com o termo pesquisado | ícone em traço + frase com o termo | texto simples + ações |
| 13 | Hero centrado com título genérico ("Descubra…") | sem hero, só título funcional | hero com voz local ("Quem faz Cascais") | sem hero |
| 14 | Imitar diretamente a referência (verde Spotify, serifa Claude) | serifa diferente (Young Serif, não Tiempos/Copernicus) | energia Spotify, mas paleta da marca | estrutura Notion, mas com marcador dourado próprio |
| 15 | Emojis como ícones | Phosphor regular | Phosphor bold | Phosphor regular, mínimo |
| 16 | Chrome iOS falso no Android/web (back-chevrons, large titles feitos à mão) | header do sistema na Fase 3 | idem | idem; é a direção mais próxima do M3 |

---

## 6. Dependências para prototipar (a aprovar)

| # | Dependência | Versão (SDK 55) | Porquê | Custo / risco |
|---|---|---|---|---|
| 1 | **`expo-glass-effect`** | `~55.0.11` (`npx expo install expo-glass-effect`) | Único caminho suportado para Liquid Glass nativo (`GlassView`, `GlassContainer`, verificações de disponibilidade). Usado pelas 3 direções no iOS 26 | Módulo nativo: obriga a **rebuild do dev client iOS** (`npx expo run:ios` / prebuild). Sem efeito em Android e web (renderiza `View`). Se o prebuild mexer nos `scripts` do `package.json`, reverter |
| 2 | **Fontes estáticas** como ficheiros em `assets/fonts/prototypes/` (licença OFL, com `OFL.txt` incluído), carregadas com o `expo-font` já instalado | n/a (**sem pacote npm**) | Testar fontes estáticas (hipótese do ecrã branco no Android) sem acrescentar dependências. Ficheiros: Young Serif 400; Figtree 400/500/600/700; Bricolage Grotesque 700/800; Hanken Grotesk 400/500/600; IBM Plex Sans 400/500/600; IBM Plex Mono 400 (**16 TTF**) | Download do Google Fonts / repositórios oficiais na Fase B. Alternativa: pacotes `@expo-google-fonts/<família>` (4 pacotes npm), que **não** recomendo |
| 3 | Ícones Phosphor regular/bold | n/a (**sem pacote**) | Paths SVG copiados para `src/prototypes/icons.ts`, desenhados com o `react-native-svg` já instalado (o padrão atual do `Icon.tsx`, sem o alterar) | nenhum |

**Não necessárias nesta fase** (e não instalar): `expo-blur` (já instalado, mas o objetivo é substituí-lo); `expo-linear-gradient` (nenhuma direção usa gradiente); `react-native-reanimated` / `gesture-handler` / `expo-haptics` (motion fora da fase); `expo-symbols` (SF Symbols dariam um iOS mais nativo, mas quebram a paridade web/iOS da comparação e precisam de fonte Material no Android; reavaliar na Fase 3); `@expo/ui` (sem controlos nativos na lista); NativeTabs (já vem com o `expo-router`, mas é uma mudança de layout fora do protótipo).

### Notas operacionais para a Fase B

- O worktree precisa de `npm ci` (o checkout principal tem `node_modules` do SDK 52).
- `app.config.ts` não define `scheme`. Para o Maestro abrir `prototypes/<direcao>?state=…` por deep link é preciso um `scheme` (alteração só no branch de protótipo), ou então navegar por toque a partir de um índice de protótipos. O light/dark no simulador muda-se com `xcrun simctl ui booted appearance dark|light`. No web, a rota aceita `?scheme=dark&state=loading|empty|error`.
- O simulador iPhone 17 Pro (iOS 26.3) precisa de um build compilado com Xcode 26, senão `isLiquidGlassAvailable()` devolve `false` e as capturas mostram o fallback.

---

## 7. Para aprovar

1. Correr `/design-taste-frontend-v1` sobre este documento e aplicar as correções que a skill indicar.
2. Aprovar (ou cortar) as 3 direções.
3. Aprovar as dependências da §6: **`expo-glass-effect ~55.0.11`** + fontes estáticas locais (sem npm).
4. `/clear` e retomar a Fase B a partir deste ficheiro.
