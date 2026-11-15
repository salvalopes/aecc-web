# Fase 2 — Direções visuais para o Diretório (`/companies`, T3 Lista)

**Data:** 2026-11-15 · **Branch:** `design/fase2-direcoes` (worktree `.claude/worktrees/fase2-direcoes`, a partir de `origin/main` @ `13f7265`)
**Estado:** Fase A **revista com a `design-taste-frontend-v1`** e aprovada para a Fase B (dependências na §7). **Parado antes da Fase B.**
**Natureza:** protótipo. Nada disto vai para o `main`.

**Parâmetros da skill:** `DESIGN_VARIANCE 8` · `VISUAL_DENSITY 4` · `MOTION_INTENSITY 6` (**sem efeito: o motion fica fora desta fase**). Ignoradas por indicação do utilizador e do `CLAUDE.md`: as regras de Tailwind, Next.js/RSC, CSS e Framer Motion. As regras visuais foram traduzidas para React Native / react-native-web.

---

## 0. O que mudou em relação à versão anterior (`caa6d5f`)

### Por decisão do utilizador

| # | Alteração |
|---|---|
| U1 | **Direção C · Índice cortada.** Ficam só A · Vitrine e B · Maré. Da C aproveitam-se dois elementos, **só no web 1280**: a **vista em tabela** como alternativa à grelha/lista e o **realce do termo pesquisado**. Os dois aplicam-se às duas direções. |
| U2 | **Só campos reais de `CompanyDirectoryEntry`** (`src/types/api.ts`): `name`, `tradeName`, `caeDescription`, `locality`, `logoUrl` (pode ser `null` → fallback com iniciais), `phone`, `website`. Passaram a **"exige API"**: o selo de benefício na empresa (o `hasMemberBenefit` é do produto, não da empresa), a secção "Em destaque" (não existe flag de destaque) e as contagens por categoria. A contagem **global** mantém-se, porque vem de `PagedResult.totalCount`. |
| U3 | **Tabs: no máximo 5.** O `/favourites` fica escondido, por isso sobram Início, Empresas, Perfil, Editar (Associado/Admin) e Utilizadores (Admin). Desaparece o conflito com o limite de 5 do Material 3 no Android. |

### Por regras da skill

| # | Regra da skill | Antes | Depois |
|---|---|---|---|
| S1 | **Rule 1 / AI Tells:** serifas proibidas em UI de software. Usar só em contexto editorial | A usava *Young Serif* nos títulos | A passa a **Outfit** (display) + Figtree (texto), sem serifa |
| S2 | **Rule 1:** display com carácter a partir da lista recomendada (Geist, Outfit, Cabinet Grotesk, Satoshi) | B usava *Bricolage Grotesque* + *Hanken Grotesk* | B passa a **Geist** (uma família estática, 4 pesos) |
| S3 | **Rule 2:** no máximo **1 cor de acento** | A tinha dois acentos (navy nas ações e dourado nos marcadores) | **A: acento único navy** (o dourado sai da UI e fica só no logo). **B: acento único dourado** (o navy passa a base neutra) |
| S4 | **Rule 2:** saturação do acento abaixo de 80% | dourado `#EDB12D` = 84% | dourado de UI **`#DCAA45` = 68%**. O `#EDB12D` continua no logo, que não se altera. Estados também desaturados: `#0E7D46` (80%) passa a `#1D7A4C` (62%) e `#F07A77`/`#FF7A73` passam a `#EC8582` (74%) |
| S5 | **Rule 2:** não misturar cinzentos quentes e frios | A tinha papel quente com cinzentos frios (`#556270`, `#A9B2BB`) | **A: escada toda quente (stone). B: escada toda fria (slate-navy)** |
| S6 | **AI Tells:** H1 que não grita, com a hierarquia feita por peso e cor | B: hero 40/800 · A: display 34 | B: **30/34 700** · A: **28/32 600** |
| S7 | **Rule 4 + pre-flight:** cards só quando a elevação comunica hierarquia; preferir espaço e divisórias | listas de cards nas duas direções | **mobile: linhas separadas por hairline, sem caixa por empresa.** A usa tiles só na grelha web (o logo é o objeto exposto). B agrupa a lista numa única superfície |
| S8 | **Rule 3 + `DESIGN_VARIANCE 8`:** nada centrado; layout assimétrico acima de 768 e **coluna única abaixo** | grelha simétrica de 2 colunas | A: cabeçalho dividido **7fr / 5fr**. B: **sidebar 1fr + conteúdo 3fr**. As duas colapsam para uma coluna abaixo de 768 |
| S9 | **Rule 4:** sombra tingida com a cor do fundo | `rgba(0,0,0,…)` / `rgba(14,36,51,…)` | as sombras usam a matiz do `bg` de cada direção (ver tokens) |
| S10 | **Rule 5:** estados completos; o vazio explica **como obter resultados**; erro inline; feedback tátil no press | vazio com frase "espirituosa" ("Sem marés…") | vazio com instruções concretas. O feedback de press fica **especificado como mudança de tom estática**; o `scale 0.98` / `translateY 1px` passa para a fase de motion |
| S11 | **Content & Data:** sem nomes genéricos, números redondos ou palavras de enchimento | não estava definido | regras de dados fictícios na §5 |
| S12 | **§4 Liquid Glass:** hairline interior + highlight `inset` | só no web | também especificado no fallback de iOS < 26 (hairline `rgba` + highlight) |
| S13 | **Ícones:** um traço global, 1,5 ou 2,0 | A regular, B bold | mantido: **A = Phosphor Regular (≈1,5)**, **B = Phosphor Bold (≈2,0)**, cada um consistente dentro da direção. Paths SVG locais (sem `@phosphor-icons/*`, por regra do `CLAUDE.md`) |
| S14 | **AI Tells:** sem preto puro | já cumprido | sem alteração (o off-black mais escuro é `#110F0D`) |

---

## 1. Ponto de partida

- **Inventário** (`docs/redesign/00-inventario.md`): o Diretório é `app/(app)/companies/index.tsx` + `CompanyDirectoryList` (pesquisa, chips de categoria, lista paginada, L/V/E). O card de empresa tem 3 variantes (D4) e o vidro está copiado inline em 5 ficheiros (D8, a substituir).
- **Dados disponíveis por linha** (`CompanyDirectoryEntry`): `name`, `tradeName | null`, `caeDescription | null`, `locality | null`, `logoUrl | null`, `phone | null`, `website | null`. Existem também `contactEmail`, `address`, `postalCode`, `postalCodeLocality` e `hasOwner`, mas ficam fora da lista por decisão do utilizador.
- **Categorias** (`Category`): `id`, `name`, `slug`, `parentId`, `children`. São hierárquicas e **não têm contagem**.
- **Paginação** (`PagedResult`): `totalCount` permite mostrar "312 empresas" para o filtro ativo.
- **Logo** (`assets/brand/aecc-logo.webp`, 239×100): lockup horizontal composto por uma fita multicolor e pelo nome por extenso em navy. Não existe versão com wordmark claro, nem o símbolo isolado, nem vetor. Em dark, as duas direções põem o logo sobre um "plate" claro.
- **Fontes:** todas estáticas (um TTF por peso), por causa da suspeita sobre o ecrã branco no Android.

---

## 2. Liquid Glass e navegação nativa no SDK 55 (verificação)

Fontes: `node_modules/expo/bundledNativeModules.json` do SDK 55 (`expo@55.0.32`, `expo-router@55.0.18`, no worktree `expo-sdk-55`); o pacote publicado `expo-glass-effect@55.0.11` (código-fonte TS e Swift inspecionados via `npm pack`, sem instalar); `expo-router/build/native-tabs/*`; e as skills do plugin Expo 1.13.9, `expo-native-ui/references/visual-effects.md` e `expo-router/references/tabs.md`.

> O `node_modules` do checkout principal continua no SDK 52. O worktree precisa de `npm ci` antes da Fase B.

| Item | Pacote / import | Versão SDK 55 | Estado | iOS 26+ | iOS < 26 | Android | Web |
|---|---|---|---|---|---|---|---|
| `GlassView`, `GlassContainer`, `isLiquidGlassAvailable()`, `isGlassEffectAPIAvailable()` | `expo-glass-effect` | `~55.0.11` | **estável**. Props: `glassEffectStyle 'regular'\|'clear'\|'none'`, `tintColor`, `isInteractive`, `colorScheme` | `UIGlassEffect` nativo. Requer Xcode 26 (`#if compiler(>=6.2)`) e `UIDesignRequiresCompatibility` ausente ou `false` | pod mínimo iOS 15.1. A view nativa monta **sem efeito** (transparente) e `isLiquidGlassAvailable()` devolve `false`. **O fallback é nosso** | `platforms: ["apple"]`, `GlassView` = `<View>` simples | `<View>` simples |
| NativeTabs | `expo-router/unstable-native-tabs` | com `expo-router ~55.0.18` | **unstable** | tab bar Liquid Glass, `minimizeBehavior`, `BottomAccessory`, `role="search"` | `UITabBar` clássico | Material 3, **máximo 5 tabs** → **compatível** com os 5 tabs (U3) | `@radix-ui/react-tabs` básico. A skill recomenda `_layout.web.tsx` |
| Vidro em sheets | `presentation: 'formSheet'` + `contentStyle` transparente | `expo-router` | estável | Liquid Glass | sheet normal | Material | modal |
| Pesquisa nativa | `Stack.SearchBar` / `headerSearchBarOptions` | `expo-router` | estável | com vidro | sem vidro | toolbar | não |
| SF Symbols | `expo-symbols` | `~55.0.9` | estável | sim | sim | só Apple | não |
| `@expo/ui` | `@expo/ui` | `~55.0.17` | dev build no 55 | SwiftUI | SwiftUI | Compose | parcial |
| Blur (D8 atual) | `expo-blur` | `~55.0.18` | estável | sim | sim | experimental | `backdrop-filter` |

**Regras de uso:**
- `GlassView` só com `isLiquidGlassAvailable() && isGlassEffectAPIAvailable()`.
- Com Reduce Transparency, superfície sólida.
- Nunca `overflow: 'hidden'` no vidro nem nos antecessores; usar `borderCurve: 'continuous'`.
- `isInteractive` só em controlos.
- Nunca animar a opacidade de um `GlassView`.
- Sombras com `boxShadow`.

**Surface de protótipo, com três ramos:**
- **iOS 26:** `GlassView`.
- **iOS < 26 / Reduce Transparency:** superfície sólida da paleta + hairline interior + highlight `inset`.
- **Web:** tint semi-opaco + `backdropFilter` + hairline + `boxShadow` com `inset`. Se o RNW não passar `backdropFilter`, fica sólido.

O `BlurView` não é usado. **NativeTabs fica fora do protótipo** (é uma decisão de layout da Fase 3).

---

## 3. As duas direções em resumo

| | **A · Vitrine** | **B · Maré** |
|---|---|---|
| Conceito | Montra luminosa em pedra quente: o logo de cada empresa é o objeto exposto | Noite atlântica: dark-first e imersiva, com o vidro como material e o dourado como única luz |
| Modo âncora | light | **dark** |
| Acento único | **navy** `#134D6F` (o dourado só no logo) | **dourado** `#DCAA45` (o navy é a base neutra) |
| Neutros | escada **quente** (stone) | escada **fria** (slate-navy) |
| Tipografia | Outfit + Figtree | Geist |
| Vidro | só no cromado (pesquisa fixa e, na Fase 3, o tab bar) | cromado (pesquisa, chips, sidebar web) |
| Lista mobile | linhas com hairline, plate do logo 56 | lista agrupada numa superfície, plate 48 |
| Web 1280 | cabeçalho dividido 7fr/5fr, **Grelha de tiles \| Tabela** | **sidebar 1fr + conteúdo 3fr**, **Lista \| Tabela** |
| Ícones | Phosphor Regular | Phosphor Bold |

---

## 4. Direções

### A · Vitrine

**Conceito:** uma montra luminosa em pedra quente onde cada empresa associada é exposta pelo seu próprio logo, com a AECC a ficar em segundo plano.

#### Paleta (neutros quentes; acento único navy)

| Papel | Light | Dark | Contraste / notas |
|---|---|---|---|
| `bg` | `#FAF8F4` | `#161412` | pedra quente / carvão quente |
| `surface` (tiles web, popovers) | `#FFFFFF` | `#201D1A` | |
| `sunken` (campo, skeleton, header da tabela) | `#F1EEE8` | `#110F0D` | |
| `border` (hairline) | `#E4DFD6` | `#312D29` | |
| `text` | `#1C1A17` | `#F2EEE8` | 16,4:1 / 15,9:1 |
| `text2` | `#5E5850` | `#B3ACA2` | 7,0:1 / 7,5:1 |
| `text3` | `#6E685F` | `#8F887E` | 5,2:1 / 5,2:1 |
| `accent` (ação primária, chip ativo, links, foco) | `#134D6F` | `#8FC0DD` | 8,5:1 / 9,4:1 · S 71% / 53% |
| `accentPressed` | `#0E3B56` | `#B0D3E7` | estado de press estático |
| `onAccent` | `#FFFFFF` | `#10222E` | 9,1:1 / 8,3:1 |
| `accentSoft` (fundo do chip ativo, realce do termo, iniciais) | `#E3EDF3` + texto `#134D6F` | `#1B2A33` + texto `#8FC0DD` | 7,6:1 / 7,5:1 |
| `logoPlate` | `#FFFFFF` | `#F2EEE8` | os logos de terceiros precisam sempre de fundo claro |
| `shadowTint` | `rgba(60,48,32,0.08)` | `rgba(0,0,0,0.0)` → sem sombra | tingida com a matiz do `bg` (S9) |
| `error` / `errorBg` | `#C4302E` / `#FBEAE8` | `#EC8582` / `#2A1816` | só estados · 5,2:1 / 6,6:1 |
| `success` / `successBg` | `#1D7A4C` / `#E7F3EC` | `#46B983` / `#14261C` | só estados |
| `info` / `infoBg` | `#2479A8` / `#E6F1F8` | `#6BB5DE` / `#13232D` | só estados |

O **dourado não aparece na UI** da A (S3): fica no logo da AECC. Isso dá à A uma leitura "papel e tinta" bem distinta da B.

#### Tipografia (estática)

- **Display:** *Outfit* 500 / 600: geométrica e arredondada, comercial sem ser corporativa.
- **Texto e UI:** *Figtree* 400 / 500 / 600.
- **Escala:** `title 28/32 (Outfit 600, −0,4)` · `heading 20/26 (Outfit 500)` · `name 17/22 (Figtree 600)` · `body 15/22` · `meta 13/18 (Figtree 500, text2)` · `label 12/16 (600, +0,2)`. `tabular-nums` em telefones e contagens.

#### Superfícies e material

- **iOS 26:** `GlassView regular` só no campo de pesquisa fixo (flutua sobre a lista ao fazer scroll). O resto é sólido.
- **iOS < 26:** pesquisa `surface` + hairline `border` + highlight `inset 0 1px 0 rgba(255,255,255,0.7)`.
- **Web:** `rgba(250,248,244,0.78)` / `rgba(32,29,26,0.78)` + `backdropFilter: blur(20px) saturate(150%)` + hairline. Hover (só web): o tile ganha hairline `text3`; a linha da tabela fica `sunken`.
- **Android (nota):** pesquisa `surfaceContainerHigh` tonal + ripple. Sem vidro.

#### Forma

- **Densidade 4:** linha de 80px no mobile, margens laterais de 20 e espaço entre secções de 28.
- **Raios:** tile 16, pesquisa 14, chip 10 (não pill), plate 12 (tile) / 10 (linha). Sempre `continuous`.
- **Sombras:** só no campo flutuante (`0 8px 24px shadowTint`). Tiles e linhas usam hairline.
- **Press (estático):** fundo `sunken` na linha e `accentPressed` nos botões. O movimento fica para a fase de motion.
- **Ícones:** Phosphor Regular a 20px (lupa, X, chevron, telefone, globo, aviso).
- **Logo AECC:** lockup de 28px de altura no topo. Em dark vai sobre `logoPlate` com raio 8.
- **Fallback sem `logoUrl`:** iniciais do `tradeName ?? name` (até 2 letras, Outfit 600) em `accentSoft`, no mesmo plate.

#### Diretório

**Mobile (390), coluna única:**
1. **Cabeçalho:** logo AECC e, por baixo, "Diretório" (title) com "312 empresas associadas" (`meta`, vem de `totalCount`), alinhados à esquerda.
2. **Pesquisa:** campo de 52px com lupa e placeholder "Nome, atividade ou localidade". Fica fixa no topo ao fazer scroll (vidro no iOS 26).
3. **Chips de categoria:** linha horizontal com scroll, **sem contagens** (U2). Inativo = hairline; ativo = `accentSoft` + texto `accent` 600. O primeiro é "Todas". As subcategorias (`children`) aparecem numa segunda linha quando o pai está ativo.
4. **Lista** sem caixas, com hairline entre linhas e estas linhas por empresa:
   - plate 56 (logo ou iniciais);
   - `tradeName ?? name` (`name`);
   - se o `tradeName` existe, `name` por baixo em `meta`;
   - `caeDescription · locality` (`meta`, com os nulos omitidos);
   - à direita, ícones-ação de telefone e globo, só quando `phone` / `website` existem;
   - chevron para o detalhe.
5. **Loading:** 6 linhas skeleton com a geometria exata (plate + 2 barras de larguras variadas) em `sunken`, estáticas.
6. **Vazio:** título "Nenhuma empresa para «termo»", subtexto **com instruções** ("Experimente outra grafia, pesquise pela localidade, ou retire o filtro Restauração.") e botão secundário "Limpar filtros".
7. **Erro:** bloco inline `errorBg` com ícone, "Não foi possível carregar o diretório." e botão `accent` "Tentar novamente". A lista anterior, se existir, mantém-se por baixo.

**Web 1280 (máx. 1200, assimétrico):**
- **Cabeçalho dividido 7fr / 5fr:** à esquerda o título e o total, à direita a pesquisa (vidro). Os chips ficam por baixo, em largura total.
- **Alternador "Grelha | Tabela"** (segmentado, à direita da linha de chips).
- **Grelha:** tiles em 2 colunas `surface` + hairline, raio 16. Plate grande de 96 em cima à esquerda, nome, `caeDescription`, `locality` e uma linha de contacto (telefone · site) no fundo. **Não usar 3 colunas iguais.**
- **Tabela** (da C): colunas Empresa (plate 32 + nome + `tradeName`) | Atividade (`caeDescription`) | Localidade | Contacto (telefone, site). Cabeçalho `sunken` fixo, linhas de 52px com hairline.
- **Realce do termo** (da C), nas duas vistas: o termo pesquisado aparece em `accentSoft` + texto `accent` 600 no nome, no `tradeName` e na atividade.

---

### B · Maré

**Conceito:** o diretório como uma noite à beira-mar em Cascais: um navy profundo e imersivo onde o vidro flutua sobre um horizonte de cor e o dourado é a única luz, sempre a marcar a ação.

#### Paleta (neutros frios slate-navy; acento único dourado)

| Papel | Dark (âncora) | Light | Contraste / notas |
|---|---|---|---|
| `bg` | `#08161F` | `#EEF2F5` | navy-noite / névoa fria |
| `horizon` (faixa de topo por trás do vidro) | `#0E2D42` | `#D6E2EA` | sólida, sem gradiente |
| `surface` (grupo da lista) | `#0F2433` | `#FFFFFF` | |
| `raised` (skeleton, hover, header da tabela) | `#15303F` | `#F6F8FA` | |
| `border` | `#23404F` | `#D5DEE5` | |
| `text` | `#EEF3F6` | `#0B1E2A` | 16,4:1 / 15,1:1 |
| `text2` | `#9FB4C1` | `#4A5D69` | 7,4:1 / 6,9:1 |
| `text3` | `#7590A0` | `#5A6D7A` | 5,5:1 / 4,8:1 |
| `accent` (ação primária, chip ativo, foco) | `#DCAA45` | `#DCAA45` (preenchimento) | S 68% · `onAccent` 8,3:1 / 8,0:1 |
| `accentText` (texto em dourado) | `#DCAA45` | `#85600F` | 8,6:1 / 5,7:1. Mesma matiz, só escurecida para texto em light |
| `onAccent` | `#0B1A23` | `#0B1E2A` | |
| `accentSoft` (realce do termo, iniciais) | `#33290F` + `#DCAA45` | `#F7EBCB` + `#85600F` | 6,7:1 / 4,8:1 |
| `logoPlate` | `#F6F8FA` | `#FFFFFF` | |
| `shadowTint` | `rgba(2,10,16,0.45)` | `rgba(11,30,42,0.10)` | tingida de navy (S9), só no web |
| `error` / `errorBg` | `#EC8582` / `#3A1A19` | `#C4302E` / `#FBEAE8` | só estados · 6,2:1 |
| `success` / `successBg` | `#46B983` / `#0F2E22` | `#1D7A4C` / `#E7F3EC` | só estados · 6,5:1 |
| `info` / `infoBg` | `#6BB5DE` / `#0D2C40` | `#2479A8` / `#E6F1F8` | só estados · 7,0:1 |

**Links:** não há uma cor de link separada (acento único). São `text` com sublinhado, e no hover web passam a `accentText`.

#### Tipografia (estática)

- **Família única:** *Geist* 400 / 500 / 600 / 700 (TTF estáticos da distribuição oficial, OFL).
- **Escala:** `hero 30/34 (700, −0,6)` · `heading 20/26 (600)` · `name 16/22 (600)` · `body 15/22 (400)` · `meta 13/18 (500, text2)` · `label 12/16 (600, +0,4)`. `tabular-nums` nos telefones.

#### Superfícies e material

- **iOS 26:** a pesquisa é uma cápsula `GlassView regular`. Os chips ficam num `GlassContainer` (com `spacing`) para se fundirem; o chip ativo é `GlassView` com `tintColor #DCAA45` e `isInteractive`. O vidro fica **sobre o `horizon`**, para ter algo para refratar. **A lista é sólida.**
- **iOS < 26:** cápsulas `raised` + hairline `rgba(255,255,255,0.08)` + highlight `inset 0 1px 0 rgba(255,255,255,0.06)`.
- **Web:** `rgba(15,36,51,0.55)` / `rgba(255,255,255,0.62)` + `backdropFilter: blur(24px) saturate(170%)`, hairline `rgba(255,255,255,0.10)` e `boxShadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 32px shadowTint`. Hover: o tint ganha +6% de opacidade.
- **Android (nota):** superfícies tonais M3 sobre `bg`, com o chip ativo `secondaryContainer` dourado. Sem vidro.

#### Forma

- **Densidade 4:** linha de 72px e uma única superfície agrupada com raio 20.
- **Raios:** grupo 20, plate 12, **pesquisa e chips em cápsula** (a geometria do Liquid Glass), botões 14. Sempre `continuous`.
- **Sombras:** nenhuma no iOS (a profundidade vem do material). No web, só no vidro.
- **Press (estático):** linha `raised`; botão `accent` mais escuro (`#C6973A`).
- **Ícones:** Phosphor Bold a 20px.
- **Logo AECC:** canto superior esquerdo do `horizon`, sobre `logoPlate` a 92% com raio 10, em dark e em light.
- **Fallback sem `logoUrl`:** iniciais (Geist 700) em `accentSoft`.

#### Diretório

**Mobile (390), coluna única:**
1. **Horizonte** (`horizon`, 200px): logo no plate e, alinhados à esquerda, o hero "Quem faz Cascais" (30/34) com "312 empresas associadas" (`meta`).
2. **Pesquisa em cápsula de vidro**, a sobrepor a borda inferior do horizonte (offset −26).
3. **Chips em cápsula** (vidro, num `GlassContainer`), **sem contagens**. O ativo é dourado. As subcategorias aparecem numa segunda linha.
4. **Lista agrupada:** uma superfície `surface` com raio 20 e divisórias hairline indentadas depois do plate. Cada linha tem:
   - plate 48;
   - `tradeName ?? name` (`name`);
   - `caeDescription` (`meta`) e `locality` (`text3`);
   - à direita, ícones de telefone e globo (só quando existem);
   - chevron.
5. **Loading:** a mesma superfície com 6 linhas skeleton `raised` de larguras variadas.
6. **Vazio:** dentro da superfície, ícone de lupa em traço, "Nenhuma empresa para «termo»" e instruções concretas, com o botão de vidro "Limpar filtros".
7. **Erro:** painel inline `errorBg` com raio 20, mensagem e botão `accent` "Tentar novamente".

**Web 1280 (máx. 1240, assimétrico 1fr / 3fr):**
- **Horizonte em largura total**, com o hero à esquerda e a pesquisa em cápsula à direita (assimétrico, nada centrado).
- **Sidebar fixa (1fr):** árvore de categorias (pai com filhos indentados) num painel de vidro, **sem contagens**. A ativa leva uma barra `accent` de 3px.
- **Conteúdo (3fr):** alternador "Lista | Tabela".
  - **Lista:** a superfície agrupada em largura total, com linhas de 64px e o contacto visível em texto (telefone, domínio do site).
  - **Tabela** (da C): Empresa | Atividade | Localidade | Telefone | Site. Cabeçalho `raised` fixo, linhas de 48px.
- **Realce do termo** (da C): `accentSoft` + `accentText` 600.

---

## 5. Dados fictícios para o protótipo (regras da skill)

- **Nomes inventados e verosímeis** de negócios do concelho, sem "Acme" nem "Empresa 1". Misturar sociedades com e sem `tradeName`: "Maré Alta — Peixaria e Garrafeira, Lda.", "Oficina Rui Barradas & Filhos", "Clínica Dentária Quinta da Marinha", "Atelier Vidraça do Estoril", "Padaria Formosa de Tires", "Contas Certas Contabilidade, Unipessoal Lda.".
- **`caeDescription`** reais da CAE Rev.3 (por exemplo "Restaurantes do tipo tradicional", "Atividades de contabilidade e auditoria", "Comércio a retalho de peixe, crustáceos e moluscos").
- **`locality`** do concelho: Cascais, Estoril, Parede, Carcavelos, São Domingos de Rana, Alcabideche, Tires, Birre, Murches, Abóboda.
- **Telefones orgânicos:** `+351 214 862 317`, `+351 912 408 663`. Nada de sequências.
- **Casos limite obrigatórios:** `logoUrl: null` (iniciais), `tradeName: null`, `caeDescription: null`, `locality: null`, sem telefone nem site, e um nome de 60+ caracteres (truncar a 2 linhas).
- **Total fictício orgânico:** 312.
- **Copy concreta**, sem "eleve", "descubra" nem "seamless". Sem emojis.

---

## 6. Clichés a evitar e como cada direção os evita (skill)

| # | Regra / AI tell da skill | A · Vitrine | B · Maré |
|---|---|---|---|
| 1 | THE LILA BAN: azul/roxo IA, glows neon, gradientes | navy da marca, sem gradientes nem glows | `horizon` sólido; dourado sem glow |
| 2 | Máx. 1 acento, saturação abaixo de 80% | navy (71%) | dourado `#DCAA45` (68%) |
| 3 | Consistência de neutros | só quentes | só frios |
| 4 | Sem Inter; display com carácter | Outfit + Figtree | Geist |
| 5 | Sem serifa em UI de app | sem serifa | sem serifa |
| 6 | H1 que não grita | 28/600 | 30/700 |
| 7 | Sem hero centrado (variance 8) | título à esquerda; header 7fr/5fr | hero à esquerda; 1fr/3fr |
| 8 | Sem 3 cards iguais | tiles em 2 colunas ou tabela | lista agrupada ou tabela |
| 9 | Cards só com hierarquia | linhas sem caixa; tiles só no web | uma superfície de grupo |
| 10 | Sombras tingidas, sem sombra genérica | `shadowTint` quente, só no flutuante | sem sombra no nativo; tinta navy no web |
| 11 | Liquid Glass com hairline interior e `inset` | pesquisa | pesquisa, chips, sidebar |
| 12 | Sem preto puro | `#110F0D` no mínimo | `#08161F` |
| 13 | Skeleton à medida do layout, sem spinner | geometria da linha/tile | geometria do grupo |
| 14 | Vazio que ensina a obter resultados | instruções + "Limpar filtros" | idem |
| 15 | Erro inline | bloco inline, a lista mantém-se | painel inline |
| 16 | Sem emojis; um traço de ícone | Phosphor Regular | Phosphor Bold |
| 17 | Dados genéricos / "Jane Doe" | §5 | §5 |
| 18 | Mobile colapsa para coluna única abaixo de 768 | sim | sim (a sidebar passa a chips) |

---

## 7. Dependências — **aprovadas para a Fase B**

| # | Dependência | Instalação | Âmbito |
|---|---|---|---|
| 1 | **`expo-glass-effect ~55.0.11`** | `npx expo install expo-glass-effect` | `GlassView` / `GlassContainer` no iOS 26. Obriga a rebuild do dev client iOS. Se o prebuild mexer nos `scripts` do `package.json`, reverter |
| 2 | **Fontes estáticas locais** em `assets/fonts/prototypes/` + `OFL.txt` por família, carregadas com o `expo-font` já instalado | sem npm | **Só A e B, 9 TTF:** Outfit 500/600 · Figtree 400/500/600 · Geist 400/500/600/700 |
| 3 | **Ícones Phosphor em SVG** | sem npm | paths Regular (A) e Bold (B) em `src/prototypes/icons.ts`, desenhados com o `react-native-svg` já instalado |

Não instalar: `expo-blur` (fica, mas não é usado), `expo-linear-gradient`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics`, `expo-symbols`, `@expo/ui`, `@phosphor-icons/*`.

### Notas operacionais para a Fase B

- O worktree precisa de `npm ci`.
- `app.config.ts` não tem `scheme`. Para o Maestro abrir `prototypes/<direcao>?state=…` é preciso acrescentá-lo só neste branch (ou então navegar por toque a partir de um índice de protótipos). Light/dark no simulador: `xcrun simctl ui booted appearance dark|light`. Web: `?scheme=dark&state=loading|empty|error`.
- O iPhone 17 Pro (iOS 26.3) precisa de um build compilado com Xcode 26, senão as capturas mostram o fallback.
- Pastas: `src/prototypes/vitrine/`, `src/prototypes/mare/`. Capturas em `docs/redesign/fase2/vitrine/` e `docs/redesign/fase2/mare/`.
