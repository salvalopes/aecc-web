# Fase 3 — Design system (direção B · Maré): Fase A, análise e plano

**Data:** 2026-11-15 · **Branch:** `design/fase3-design-system` (worktree `.claude/worktrees/fase3-design-system`, a partir de `origin/main` @ `6c60492`, que já inclui os PR #17 e #18)
**Natureza:** só leitura e plano. Nenhum ficheiro de código foi alterado e nada foi instalado. **Parado antes da Fase B, à espera de aprovação.**

**Fontes:**

- `docs/redesign/00-inventario.md`
- `docs/redesign/fase2-direcoes.md`
- `src/prototypes/mare/*` e `src/prototypes/shared.tsx`. Já estão no `main` através do PR #18, por isso foram lidos do próprio worktree.
- O código atual de `app/` e `src/`.
- A documentação oficial e o registo npm, verificados a 2026-11-15. Os URLs estão em cada secção.

**Versões do projeto** (`package.json`): `expo ~55.0.32`, `expo-router ~55.0.18`, `react-native 0.83.10`, `react 19.2.0`, `react-native-web ^0.21.0`, `react-native-screens ~4.23.0`, `expo-glass-effect ~55.0.11` (já instalado), `expo-blur ~55.0.18`, New Architecture.

---

## 0. Resumo das decisões propostas

| #   | Tema                   | Recomendação                                                                                                                                                                                                                                            |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Arquitetura de estilos | **(a) `createStyles(theme)` + `useStyles()` caseiro sobre `StyleSheet`**. Zero dependências novas                                                                                                                                                       |
| 2   | Navegação              | **NativeTabs (`expo-router/unstable-native-tabs`) no iOS e no Android, e `_layout.web.tsx` com tabs headless do `expo-router/ui` no web.** A configuração das tabs fica num único ficheiro partilhado. As JS Tabs atuais ficam como plano B documentado |
| 3   | Tokens                 | Reescrever `src/theme/` com os valores da Maré, em ficheiros separados por grupo, com tipos fechados. As chaves antigas ficam como aliases temporários durante a migração                                                                               |
| 4   | Componentes            | 24 componentes base, que resolvem D1–D9. Dos 17 atuais: 10 são reaproveitados, 4 substituídos e 3 eliminados                                                                                                                                            |
| 5   | Marca                  | PNG `@3x` (sem transformer de SVG) num `BrandLockup` único. Ícone, splash e PWA a partir de `assets/brand/redesign-2026/`. A variante do ícone fica para a Fase B                                                                                       |
| 6   | Fase B                 | 15 passos (B0–B14). Cada um termina com `lint`, `tsc` e Playwright 8/8                                                                                                                                                                                  |
| 7   | Dependências           | **Nenhuma obrigatória.** Uma opcional (`expo-system-ui`) e uma remoção (`expo-blur`), ambas a aprovar                                                                                                                                                   |

---

## 1. Arquitetura de estilos

### 1.1 Verificação das opções

|                            | (a) `createStyles(theme)` / `useStyles`                                                                                                                | (b) `react-native-unistyles`                                                                                                                                                                           | (c) NativeWind                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versão atual               | n/a (código próprio, cerca de 40 linhas)                                                                                                               | **3.8.1** (2026-11-03), mas exige **RN ≥ 0.85 / Expo SDK 56+**. A última compatível com RN 0.83 é a **3.7.0** (2026-10-28, peer `react-native >=0.81.0`)                                               | **4.2.7** (2026-09-14) estável. A v5 é `5.0.0-rc.1` e "not intended for production use"                                                                                                            |
| Requisitos                 | nenhum                                                                                                                                                 | `react-native-nitro-modules` (≥ 0.37.1, versão fixa), `@react-native/normalize-colors`, **só New Architecture**, **plugin Babel** `react-native-unistyles/plugin` obrigatório, dev build (sem Expo Go) | `tailwindcss ^3.4.17` + `react-native-css-interop 0.2.7`, que tem como peer **`react-native-reanimated >=3.6.2`** (e worklets com o Reanimated 4). A v5 precisa de Tailwind 4 + `react-native-css` |
| Suporte ao SDK 55          | sim (é `StyleSheet`)                                                                                                                                   | só fixando a 3.7.0. Não há problemas conhecidos com o 0.83 nas notas de versão (não verificado num build)                                                                                              | **sem declaração oficial**. Só existe um fix de hot-reload "Metro 0.83+ (SDK 55/56)" no css-interop 0.2.6                                                                                          |
| Tema light/dark em runtime | sim: o `ThemeContext` já existe e o hook memoiza por tema                                                                                              | sim: `UnistylesRuntime.setTheme`, `adaptiveThemes`. No web vira variáveis CSS (troca de uma classe no `<html>`)                                                                                        | sim: `colorScheme.set()`                                                                                                                                                                           |
| Tokens tipados             | sim: `Theme` é um tipo TS fechado (`as const`)                                                                                                         | sim, por module augmentation                                                                                                                                                                           | parcial (classes em string, tipagem via plugin de IDE)                                                                                                                                             |
| Web (RNW 0.21)             | sim, o mesmo que hoje. `boxShadow`/`backdropFilter` passam como estilo                                                                                 | sim, gera classes CSS e media queries                                                                                                                                                                  | sim, mas com Tailwind/CSS, que o CLAUDE.md exclui                                                                                                                                                  |
| Desempenho                 | `StyleSheet.create` por tema, cache por `(factory, theme)`. Os componentes re-renderizam ao trocar de tema, o que já acontece hoje via contexto        | o melhor: atualiza no C++ sem re-render                                                                                                                                                                | bom no nativo (interop em runtime)                                                                                                                                                                 |
| Variantes por plataforma   | `Platform.select` dentro da factory e `.web.tsx` quando necessário                                                                                     | `_web`, `_hover`, breakpoints, `variants`                                                                                                                                                              | `ios:` / `android:` / `web:`                                                                                                                                                                       |
| Esforço nos 477 literais   | médio: mover cada `StyleSheet.create` do topo do módulo para `createStyles((t) => …)` e trocar os literais por tokens. É mecânico, ficheiro a ficheiro | médio: é o mesmo trabalho com outra API, mais a configuração do Babel e os rebuilds                                                                                                                    | **alto**: reescrever todos os estilos em classes                                                                                                                                                   |
| Dependências novas         | **0**                                                                                                                                                  | 2–3 nativas (unistyles, nitro, normalize-colors)                                                                                                                                                       | 3–5 (nativewind, tailwind, css-interop, reanimated, worklets)                                                                                                                                      |
| Risco                      | baixo                                                                                                                                                  | **médio-alto**: fica presa numa versão que não acompanha o SDK 56 sem um upgrade conjunto. É código nativo novo e a configuração tem armadilhas (Babel _ou_ Metro, nunca os dois)                      | **alto**: proibido pelo CLAUDE.md, arrasta o Reanimated (não aprovado) e não tem suporte declarado ao SDK 55                                                                                       |
| Manutenção                 | nossa, mas mínima                                                                                                                                      | upstream ativo, acoplado à versão do RN                                                                                                                                                                | upstream com a transição v4→v5 por fazer                                                                                                                                                           |

Fontes:

- https://www.unistyl.es/v3/start/getting-started
- https://github.com/jpudysz/react-native-unistyles/releases
- https://www.unistyl.es/v3/references/web-styles
- https://www.unistyl.es/v3/guides/theming
- https://www.nativewind.dev/docs/getting-started/installation
- https://github.com/nativewind/nativewind/releases
- https://www.nativewind.dev/v5/getting-started/installation
- `npm view` a 2026-11-15

### 1.2 Recomendação: (a) `createStyles` + `useStyles`

**Porquê:**

1. A causa estrutural da dívida identificada no inventário (§3.3) é o `StyleSheet.create` correr fora do `useTheme()`. A (a) resolve exatamente isso, sem tocar no pipeline de build.
2. É a única opção com **zero dependências novas**. O CLAUDE.md exige aprovação para qualquer dependência, e o objetivo da Fase 3 é o design system, não o motor de estilos.
3. O Unistyles 3 ficaria fixo na 3.7.0 e acoplaria o próximo upgrade de SDK ao da biblioteca. O ganho de desempenho (sem re-render ao trocar de tema) não é relevante numa app de diretório onde a troca de tema é rara.
4. O NativeWind está excluído pelo CLAUDE.md e exigiria o Reanimated.
5. A migração para (b) continua possível mais tarde: as factories `(theme) => estilos` podem ser portadas quase 1:1 para `StyleSheet.create((theme) => …)` do Unistyles.

**API proposta** (em `src/theme/createStyles.ts`):

```ts
export function createStyles<T extends NamedStyles<T>>(factory: (t: Theme) => T) {
  return factory;
}

export function useStyles<T extends NamedStyles<T>>(factory: (t: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [factory, theme.scheme]);
}
```

**Regras:**

- Uma factory por ficheiro, declarada no topo do módulo (referência estável).
- Os literais só são aceites para `0`, `1` (flex), percentagens e `StyleSheet.hairlineWidth`.
- Na Fase B, uma regra ESLint (`no-restricted-syntax`, já disponível com o `eslint` atual) passa a proibir `StyleSheet.create` fora de `src/theme/`. Avisa primeiro e só depois dá erro.

---

## 2. Navegação

### 2.1 Comparação

| Critério               | **NativeTabs** (`expo-router/unstable-native-tabs`)                                                                                                                         | **JS `Tabs`** + tab bar própria com `GlassView`                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| iOS 26                 | **Liquid Glass do sistema** (`UITabBar`): `minimizeBehavior`, morph e acessibilidade nativa sem código                                                                      | `GlassView` imita o material, mas não o comportamento do sistema (minimizar ao fazer scroll, transições). É código nosso para manter |
| iOS < 26               | `UITabBar` clássico (transparente no scroll edge, com `backgroundColor`/`blurEffect` configuráveis até ao iOS 18)                                                           | o fallback sólido + hairline do `GlassSurface`                                                                                       |
| Android                | barra inferior nativa, **máx. 5 tabs** (compatível com o U3), `labelVisibilityMode`. O docs não diz explicitamente que é Material 3 (**não verificado**)                    | barra JS. Material 3 só se o desenharmos à mão (indicador em pill, ripple)                                                           |
| Web                    | "basic implementation, loosely based on iPad design". **O docs recomenda `_layout.web.tsx` com as tabs headless do `expo-router/ui`**                                       | funciona no web como hoje                                                                                                            |
| Tabs por papel         | `<NativeTabs.Trigger hidden>`. Mudar a visibilidade **remonta o navegador e perde o estado**: o papel tem de estar resolvido antes de montar. Não há `NativeTabs.Protected` | `href: null` (confirmado) ou `Tabs.Protected guard`                                                                                  |
| Ícones                 | `sf` (iOS), `md`/`drawable` (Android, uma só string no SDK 55, sem variante selecionada), `src` (imagem)                                                                    | o `<Icon>` SVG atual (Phosphor Bold)                                                                                                 |
| Estrutura de rotas     | **um `Stack` dentro de cada tab** (recomendado). Hoje os ecrãs de detalhe são `Tabs.Screen` com `href: null` e têm de passar para stacks                                    | sem alterações                                                                                                                       |
| Esquema de cor         | **a barra não segue um esquema de cor definido só em JS.** O nosso toggle manual (`aecc_theme_mode`) tem de propagar também para o nativo                                   | segue o `useTheme()`                                                                                                                 |
| Estabilidade no SDK 55 | **unstable/beta, "API subject to change"**. Só fica estável no SDK 58 (`expo-router/native-tabs`)                                                                           | estável                                                                                                                              |

Fontes:

- https://docs.expo.dev/router/advanced/native-tabs/
- https://docs.expo.dev/versions/v55.0.0/sdk/router-native-tabs/
- https://docs.expo.dev/router/advanced/tabs/
- https://docs.expo.dev/router/advanced/protected/
- https://docs.expo.dev/versions/v55.0.0/sdk/glass-effect/

### 2.2 Recomendação: NativeTabs no nativo e tabs headless no web

**Porquê:** a direção Maré é "o vidro como material". No iOS 26, o Liquid Glass do sistema na tab bar é exatamente o que o `GlassView` tentaria imitar, e com as NativeTabs vem sem código nosso, no iOS < 26 cai no `UITabBar` clássico e no Android dá a barra nativa. Os 5 tabs do U3 cabem no limite do Android. O "unstable" é um risco real, mas fica **contido no ficheiro de layout**: se a API mudar, o plano B (JS `Tabs` + `GlassSurface`) troca só esse ficheiro.

**Condições e mitigação:**

1. **Configuração única** em `src/navigation/tabs.ts`: `[{ name, label, sf, md, icon, roles }]`. É consumida por `app/(app)/(tabs)/_layout.tsx` (NativeTabs) e por `_layout.web.tsx` (`expo-router/ui`), para que os papéis nunca divirjam.
2. **Papel resolvido antes de montar:** o `AppLayout` já devolve `null` enquanto `isLoading`. Mantém-se, passando a mostrar o estado T2 "a carregar sessão" em vez de `null`. Uma mudança de papel durante a sessão (rara) remonta as tabs, o que é aceitável.
3. **Tema manual:** no nativo, o `ThemeProvider` chama `Appearance.setColorScheme(mode)` (API do RN, sem dependências) quando há override, para que a barra nativa e o `GlassView` sigam a escolha do utilizador.
4. **Rotas:** os URLs não mudam, porque os grupos não aparecem no URL. A nova estrutura fica assim:

```
app/(app)/_layout.tsx                 ← guarda de sessão + Stack
app/(app)/(tabs)/_layout.tsx          ← NativeTabs (iOS/Android)
app/(app)/(tabs)/_layout.web.tsx      ← expo-router/ui TabList (web)
app/(app)/(tabs)/index.tsx            ← Início
app/(app)/(tabs)/companies/_layout.tsx  (Stack) · index.tsx · [id].tsx · category/[categoryId].tsx
app/(app)/(tabs)/profile/index.tsx
app/(app)/(tabs)/my-companies/_layout.tsx (Stack) · index.tsx · [id]/edit.tsx (T7)
app/(app)/(tabs)/users/_layout.tsx (Stack) · index.tsx · new.tsx (T7)
app/(app)/products/[id].tsx · products/[id]/edit.tsx (T7) ← empurrados no Stack de (app), por cima das tabs
app/(app)/favourites/index.tsx        ← fora das tabs (escondido, U3), a rota continua a existir
```

5. **Web 390:** barra inferior em vidro (`GlassSurface`) com `TabList`/`TabTrigger`. **Web 1280:** a navegação fica no `horizon`, à esquerda, numa linha de triggers em cápsula, e a sidebar da Maré fica livre para as categorias.
6. **Ícones:**
   - iOS: SF Symbols por nome (`house`, `building.2`, `person.crop.circle`, `pencil`, `person.2.badge.gearshape`). Não precisa de `expo-symbols`, porque o `sf` das NativeTabs é nativo.
   - Android: `md` (Material Symbols por nome) ou `drawable`. **Verificar na B7** se o `md` funciona sem recursos extra no SDK 55. Se não funcionar, usar `src` com PNG exportados dos paths Phosphor, sem dependências.
7. **Plano B** (se B7 falhar num critério): JS `Tabs` com `tabBar` próprio sobre `GlassSurface`, com a mesma configuração.

---

## 3. Tokens: estrutura em `src/theme/`

Princípio: **tipos fechados (`as const`) e nomes por papel**, não por valor. O `useTheme()` continua a ser o único ponto de acesso.

```
src/theme/
  palette.ts        valores brutos da Maré (dark e light), privados ao theme
  colors.ts         ThemeColors por papel → lightColors / darkColors
  glass.ts          GlassTokens (material) por esquema
  typography.ts     família Geist + escala de texto
  tokens.ts         spacing, radius, size, border, opacity, layout, breakpoints, shadow (web)
  motion.ts         NÃO criado na Fase B: o motion fica só como especificação (§3.7)
  createStyles.ts   createStyles / useStyles (§1.2)
  ThemeContext.tsx  ThemeProvider / useTheme. Modo system|light|dark, override persistido, Appearance.setColorScheme
  index.ts          tipo Theme + reexportações
```

### 3.1 Cor (`colors.ts`), da Maré (fase2 §4 B)

| Papel                           | Dark (âncora)                                                | Light                             | Uso                                               |
| ------------------------------- | ------------------------------------------------------------ | --------------------------------- | ------------------------------------------------- |
| `bg`                            | `#08161F`                                                    | `#EEF2F5`                         | fundo da app (também `--aecc-surface-app` no web) |
| `horizon`                       | `#0E2D42`                                                    | `#D6E2EA`                         | faixa de topo por trás do vidro (T3/T5)           |
| `surface`                       | `#0F2433`                                                    | `#FFFFFF`                         | grupo de lista, painéis sólidos                   |
| `raised`                        | `#15303F`                                                    | `#F6F8FA`                         | skeleton, press, hover, cabeçalho da tabela       |
| `border`                        | `#23404F`                                                    | `#D5DEE5`                         | hairlines                                         |
| `text` / `text2` / `text3`      | `#EEF3F6` / `#9FB4C1` / `#7590A0`                            | `#0B1E2A` / `#4A5D69` / `#5A6D7A` | 16,4 / 7,4 / 5,5 : 1 (dark)                       |
| `accent`                        | `#DCAA45`                                                    | `#DCAA45`                         | ação primária, chip ativo, foco                   |
| `accentPressed`                 | `#C6973A`                                                    | `#C6973A`                         | press estático                                    |
| `accentText`                    | `#DCAA45`                                                    | `#85600F`                         | texto em dourado                                  |
| `onAccent`                      | `#0B1A23`                                                    | `#0B1E2A`                         | texto sobre o acento                              |
| `accentSoft` / `accentSoftText` | `#33290F` / `#DCAA45`                                        | `#F7EBCB` / `#85600F`             | realce do termo, iniciais                         |
| `logoPlate`                     | `#F6F8FA`                                                    | `#FFFFFF`                         | fundo dos logos de terceiros                      |
| `focusRing`                     | `#DCAA45`                                                    | `#85600F`                         | anel de foco (web)                                |
| `error` / `errorBg`             | `#EC8582` / `#3A1A19`                                        | `#C4302E` / `#FBEAE8`             | só estados                                        |
| `success` / `successBg`         | `#46B983` / `#0F2E22`                                        | `#1D7A4C` / `#E7F3EC`             | só estados                                        |
| `info` / `infoBg`               | `#6BB5DE` / `#0D2C40`                                        | `#2479A8` / `#E6F1F8`             | só estados                                        |
| `warning` / `warningBg`         | **a definir na B1 com a skill** (falta na Maré; hoje existe) | idem                              | só estados                                        |
| `scrim`                         | `rgba(2,10,16,0.6)`                                          | `rgba(11,30,42,0.4)`              | lightbox, diálogo                                 |

**Removidos:** `accentGold*`, `textOnGold`, `textOnPrimary`, `textLink` (os links são `text` sublinhado), `featured*` e `heroScrim*` (sem consumidor).

**Compatibilidade:** durante as fases B6–B13, `colors.ts` exporta também as chaves antigas mapeadas para os papéis novos (por exemplo `surfaceApp → bg`, `accentPrimary → accent`), marcadas `@deprecated`. A B14 apaga-as.

### 3.2 Tipografia (`typography.ts`)

- **Família única Geist**, TTF estáticos 400/500/600/700. Os ficheiros saem de `assets/fonts/prototypes/geist/` e passam para `assets/fonts/geist/` (com o `OFL.txt`). `LibreFranklin` e `SourceSans3` saem na B14.
- **Escala** (tamanho/altura de linha, peso, tracking):
  - `hero` 30/34, 700, −0,6
  - `title` 24/30, 600, −0,3 (T4 detalhe; novo, a validar com a skill)
  - `heading` 20/26, 600
  - `name` 16/22, 600
  - `body` 15/22, 400
  - `meta` 13/18, 500, cor `text2`
  - `label` 12/16, 600, +0,4
- **Utilitários:** `tabular` (`fontVariant: ['tabular-nums']`), `inputMin: 16`, que é o tamanho mínimo dos inputs para evitar o auto-zoom do Safari iOS e se mantém.
- **Tipo:** `TextVariant = keyof typeof textStyles`, consumido pelo componente `<Text variant>`.

### 3.3 Espaçamento, raios, tamanhos (`tokens.ts`)

- **spacing:** `0:0 '2xs':2 xs:4 sm:8 md:12 lg:16 xl:20 '2xl':24 '3xl':28 '4xl':32 '5xl':40 '6xl':48`
  - Escala nova, com chaves semânticas. Os valores atuais `6/10/14` são absorvidos por `sm`/`md`/`lg` na migração, com revisão visual.
- **layout:**
  - `gutter: 20` (margem lateral mobile)
  - `sectionGap: 28`
  - `maxWidth: 1240`
  - `sidebar: '1fr' / content: '3fr'`, implementado com flex 1:3
  - `horizonHeight: 200`
  - `searchOverlap: -26`
- **breakpoints:** `md: 768` (abaixo é coluna única) · `lg: 1280`. Hook `useBreakpoint()`, sobre o `useWindowDimensions`.
- **radius:**
  - `xs:6` (barras de skeleton)
  - `sm:10` (plate do logo AECC)
  - `plate:12`
  - `control:14` (botões, campos)
  - `group:20` (superfícies agrupadas, painéis)
  - `capsule:999` (pesquisa, chips)
  - Sempre `borderCurve: 'continuous'`.
- **size:**
  - `icon { sm:16, md:20, lg:24, xl:28 }`
  - `hitTarget: 44`
  - `plate { sm:32, md:48, lg:96 }`
  - `row { mobile:72, web:64, table:48 }`
  - `search: 52`
- **border:** `hairline: StyleSheet.hairlineWidth` · `default: 1` · `accentBar: 3`.
- **opacity:** `disabled: 0.45`.
- **shadow** (só web, `boxShadow`): `glass` = `inset 0 1px 0 {glassHighlight}, 0 12px 32px {shadowTint}`. Nativo: **sem sombra** (a profundidade vem do material).

### 3.4 Superfícies e vidro (`glass.ts`)

```ts
interface GlassTokens {
  tint: string; // web: rgba(15,36,51,0.55) | rgba(255,255,255,0.62)
  tintHover: string; // +6% opacidade
  border: string; // rgba(255,255,255,0.10) | rgba(11,30,42,0.08)
  highlight: string; // inset 0 1px 0: rgba(255,255,255,0.08) | rgba(255,255,255,0.8)
  solid: string; // fallback iOS<26 / Reduce Transparency / Android: = raised
  shadowTint: string; // rgba(2,10,16,0.45) | rgba(11,30,42,0.10)
  webFilter: string; // 'blur(24px) saturate(170%)'
}
```

As 5 variantes atuais (`neutral`/`primary`/`gold`/`panel`/`heroPanel`) **desaparecem**. Na Maré há um único material, e o chip ativo é o mesmo vidro com `tintColor = accent`.

### 3.5 Tema (`ThemeContext.tsx`)

- `scheme: 'light' | 'dark'` e `mode: 'system' | 'light' | 'dark'`. A chave `aecc_theme_mode` mantém-se e passa a aceitar `system`.
- `Appearance.setColorScheme(mode === 'system' ? null : mode)` no nativo (§2.2-3).
- Web: as custom properties de `public/index.html` (`--aecc-surface-app`, `--aecc-focus-ring`) mantêm-se, alimentadas por `bg` e `focusRing`. Na B6, o `theme_color` do `manifest.json` muda para `#08161F`.
- Âncora: **a Maré é dark-first**, mas o valor por omissão continua a ser o do sistema. Fica em aberto se a primeira abertura deve forçar o dark (decisão de produto).

### 3.6 Ícones

- `Icon.tsx` mantém a API (`name`, `size`, `color`), mas os paths passam a **Phosphor Bold**, a partir de `src/prototypes/icons-paths.ts` (`bold`).
- `size` aceita `keyof size.icon`, e números só durante a migração.
- A cor por omissão passa a `colors.text` em vez de `#000000`.

### 3.7 Motion (só especificação, sem código)

Enquanto o `react-native-reanimated` não for aprovado, **não se cria `motion.ts` nem se escreve código de animação**. Para a fase de motion, fica registado:

| Interação            | Nativo (animate-expo decide)                                                                                | Web (apple-design decide)                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Press de linha/botão | hoje: troca de tom estática (`raised` / `accentPressed`). Na fase de motion, `scale 0.98` com spring rápido | resposta imediata no pointer-down, interrompível |
| Chip ativo           | morph do `GlassContainer` (nativo do iOS 26, sem código)                                                    | troca de tint, sem transição CSS                 |
| Tab bar              | comportamento do sistema (NativeTabs)                                                                       | sem animação até à fase de motion                |
| Reduce Motion        | desliga tudo exceto as alterações de opacidade                                                              | `prefers-reduced-motion` via `AccessibilityInfo` |

---

## 4. Componentes

### 4.1 Templates (Fase 1) e ecrãs

| Template              | Ecrãs                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1 Autenticação       | `/login`, `/register`, `/forgot-password`, `/confirm-email`, `/reset-password`                                                                         |
| T2 Estado             | `/auth/callback`, `+not-found`, sessão a carregar (hoje `null`), **sem permissão** (novo, substitui o redirect silencioso do `RoleGuard`)              |
| T3 Lista              | `/companies`, `/my-companies`, `/users`, (`/favourites`, escondido)                                                                                    |
| T4 Detalhe            | `/companies/:id`, `/products/:id`                                                                                                                      |
| T5 Início             | `/`                                                                                                                                                    |
| T6 Perfil             | `/profile`                                                                                                                                             |
| T7 Formulário em ecrã | editar empresa, criar/editar produto, criar utilizador (**hoje são modais em 4 ecrãs**), e `/companies/category/:id` continua a ser um redirect sem UI |

### 4.2 Componentes base (todos em `src/components/ui/`, salvo indicação)

| #   | Componente                                                                                                     | Templates      | Resolve                             | Notas                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| 1   | `Text` (`variant`, `color`, `tabular`)                                                                         | todos          | 59 literais de tipografia           | papéis da §3.2                                                                   |
| 2   | `Screen` (safe area, `bg`, scroll, `maxWidth`, colunas 1fr/3fr ≥ 768)                                          | todos          | —                                   | base de layout dos templates                                                     |
| 3   | `Horizon` (faixa, logo, hero, `meta`, slot à direita no web)                                                   | T3, T5         | —                                   |                                                                                  |
| 4   | `GlassSurface` (iOS 26 `GlassView` / iOS<26 e Android sólido + hairline + inset / web tint + `backdropFilter`) | todos          | **D8**                              | promovido de `src/prototypes/shared.tsx` com a capability (`useGlassCapability`) |
| 5   | `GlassGroup` (`GlassContainer` no iOS 26)                                                                      | T3             | D8                                  | idem                                                                             |
| 6   | `Surface` (sólida: `surface` / `raised`, raio `group`)                                                         | T3, T4, T6, T7 | substitui `Card`                    |                                                                                  |
| 7   | `Button` (`primary` / `secondary` / `glass` / `destructive`; `sm` / `md`; `loading`)                           | todos          | **D1**, **D6**                      | `ghost` e `lg` desaparecem                                                       |
| 8   | `IconButton` (+ variante de contacto)                                                                          | T3, T4         | —                                   | absorve o `ContactAction` do protótipo                                           |
| 9   | `TextField` (label, hint, erro, foco, mínimo de 16px)                                                          | T1, T7         | **D2**                              | evolução do `Input`                                                              |
| 10  | `SearchField` (cápsula de vidro, 52px, limpar)                                                                 | T3, T5         | **D3**                              |                                                                                  |
| 11  | `Chip` + `ChipRow` (cápsula, scroll horizontal, 2.ª linha de subcategorias)                                    | T3             | —                                   | `Chip` reaproveitado                                                             |
| 12  | `ListGroup` + `ListRow` (superfície agrupada, hairline indentada, chevron, press)                              | T3, T4, T6     | **D4** (base)                       |                                                                                  |
| 13  | `CompanyRow` (plate, nome, `meta`, contactos) sobre `ListRow`                                                  | T3, T5         | **D4**                              | substitui `companyRow`, `CompanyDirectoryRow` e `MyCompanyCard`                  |
| 14  | `Plate` (logo ou iniciais, `sm` / `md` / `lg`)                                                                 | T3, T4, T5     | —                                   | do protótipo                                                                     |
| 15  | `Highlight` (realce do termo)                                                                                  | T3             | —                                   | do protótipo                                                                     |
| 16  | `Skeleton` (`Bar`) + `SkeletonRow` com a geometria da linha                                                    | T3, T4, T5     | 0 skeletons hoje                    | substitui o `LoadingSpinner` nas listas                                          |
| 17  | `EmptyState` (ícone, título, instruções, ação)                                                                 | T3, T5         | —                                   | reescrito (instruções concretas)                                                 |
| 18  | `ErrorState` (painel inline `errorBg`, raio 20, retry)                                                         | T3, T4, T5     | **D5**                              | reescrito                                                                        |
| 19  | `InlineAlert` (erro ou sucesso de uma ação)                                                                    | T4, T7         | `Alert.alert` em 6 pontos           |                                                                                  |
| 20  | `StateScreen` (T2: ícone, título, texto, ação; também "sem permissão" e "a carregar sessão")                   | T2             | lacunas do inventário §1.4          |                                                                                  |
| 21  | `BrandLockup` (light/dark automático, `sm` 28 / `md` 40 / `lg` 64 de altura)                                   | T1, T2, T3, T5 | **D7**                              | substitui o `aecc-logo.webp`                                                     |
| 22  | `SegmentedControl` (Lista \| Tabela, só web ≥ 1280)                                                            | T3             | —                                   |                                                                                  |
| 23  | `DataTable` (cabeçalho `raised` fixo, linhas de 48)                                                            | T3 (web)       | —                                   |                                                                                  |
| 24  | `FormLayout` (secções, rodapé fixo com Guardar/Cancelar)                                                       | T7             | substitui o `Modal` nos formulários |                                                                                  |

Utilitários (não visuais):

- `src/utils/address.ts` → `formatAddressLine()`, que resolve o **D9**.
- `src/hooks/useBreakpoint.ts`.
- `src/navigation/tabs.ts`.

### 4.3 Mapa dos 17 componentes atuais

| Atual                  | Decisão                                           | Destino                                                                                                                     |
| ---------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Icon`                 | **reaproveitar**                                  | paths Phosphor Bold, escala `size.icon`, cor por omissão `text`                                                             |
| `Button`               | **reaproveitar** (reescrito sobre `useStyles`)    | #7. Resolve D1/D6                                                                                                           |
| `IconButton`           | **reaproveitar**                                  | #8                                                                                                                          |
| `Input`                | **reaproveitar** → `TextField`                    | #9. Resolve D2                                                                                                              |
| `Chip`                 | **reaproveitar**                                  | #11                                                                                                                         |
| `Badge`                | **reaproveitar**                                  | 4 tons: `neutral` / `info` / `success` / `error` (`featured` e `warning` a rever)                                           |
| `Switch`               | **reaproveitar**                                  | cores dos tokens (thumb sem `#ffffff`)                                                                                      |
| `EmptyState`           | **reaproveitar** (reescrito)                      | #17                                                                                                                         |
| `ErrorState`           | **reaproveitar** (reescrito)                      | #18. Resolve D5                                                                                                             |
| `Card`                 | **substituir**                                    | `Surface` (#6)                                                                                                              |
| `CategoryTile`         | **substituir**                                    | no T5, chips ou `ListRow` com ícone (a decidir com a skill na B13). Sai o vidro inline (D8)                                 |
| `TopBar`               | **substituir**                                    | `Horizon` + tabs. Desaparece o código morto (`onLogin`/`onRegister`/`compact`)                                              |
| `CompanyDirectoryList` | **substituir** (a lógica fica)                    | `ListGroup` + `CompanyRow` + `Skeleton`. Mantém os `testID` `directory.row` / `directory.empty`                             |
| `LoadingSpinner`       | **eliminar**                                      | `Skeleton` nas listas e `StateScreen` no T2                                                                                 |
| `Modal`                | **eliminar**                                      | formulários em ecrã (T7, `FormLayout`). As confirmações destrutivas ficam no `Alert.alert` nativo / `window.confirm` no web |
| `ImageLightbox`        | **reaproveitar**                                  | cores dos tokens (`scrim`), sem `#000` nem `#fff`                                                                           |
| `RoleGuard`            | **eliminar** (a lógica passa ao `useRequireRole`) | sem permissão → `StateScreen` em vez de redirect silencioso                                                                 |

Contas: 10 reaproveitados, 4 substituídos, 3 eliminados. Também desaparecem os sub-componentes locais `HeaderLogo` (D7), `TabLabel` (NativeTabs), `MyCompanyCard` e `CompanyDirectoryRow` (D4).

### 4.4 Duplicados D1–D9 e componentes que os resolvem

| #   | Duplicado                                           | Resolvido por                 |
| --- | --------------------------------------------------- | ----------------------------- |
| D1  | botão `TouchableOpacity` em 6 ecrãs de autenticação | `Button`                      |
| D2  | `TextInput` cru em 5 ecrãs                          | `TextField`                   |
| D3  | 2 campos de pesquisa                                | `SearchField`                 |
| D4  | 3 cards de empresa                                  | `ListRow` + `CompanyRow`      |
| D5  | `errorWrap` inline em `/`                           | `ErrorState`                  |
| D6  | `ActivityIndicator` cru em 6 ecrãs                  | `Button loading`              |
| D7  | 4 variantes do lockup                               | `BrandLockup`                 |
| D8  | vidro inline em 5 ficheiros                         | `GlassSurface` / `GlassGroup` |
| D9  | `buildAddressLine()` ×2                             | `formatAddressLine()`         |

---

## 5. Marca

**Origem:** `assets/brand/redesign-2026/`, com 27 ficheiros e 888K. Versionada nesta fase no commit `chore(brand)`, sem alterações. **Ainda nada é usado no código.**

| Item                                                                                                                                            | Hoje                                                                                                                                                              | Fase B                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lockup na UI (6 usos de `aecc-logo.webp`: `(app)/_layout.tsx:12`, `(app)/index.tsx:131`, `register.tsx:48,68`, `login.tsx:54`, `TopBar.tsx:62`) | webp 239×100, **erro de descodificação no Android**                                                                                                               | `BrandLockup` com `aecc-logo-light@3x.png` / `aecc-logo-dark@3x.png`, escolhido por `scheme`, via `Image` do RN. **PNG em vez de SVG:** desenhar SVG de ficheiro exigiria `react-native-svg-transformer` (dependência nova + configuração do Metro). Se for preciso nitidez infinita, o SVG pode ser convertido à mão num componente `react-native-svg`, mas os 41 KB de contornos não compensam. `accessibilityLabel` = "AECC — Associação Empresarial do Concelho de Cascais" |
| `aecc-logo.webp`                                                                                                                                | em uso                                                                                                                                                            | apagado na B3 depois de 0 referências (`grep`)                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Ícone da app (`assets/icon.png`)                                                                                                                | genérico                                                                                                                                                          | **variante escolhida pela skill na Fase B** entre `icon-white`, `icon-navy`, `icon-navy-deep`, `icon-navy-mono`, `icon-white-mono` (1024 PNG) → `app.config.ts` `icon`. No iOS, verificar com o plugin Expo se o SDK 55 aceita `ios.icon` com variantes dark/tinted ou um ficheiro do Icon Composer para o iOS 26 (**não verificado nesta fase**)                                                                                                                               |
| Adaptive icon (Android)                                                                                                                         | `adaptive-icon.png`, fundo `#ffffff`                                                                                                                              | `android.adaptiveIcon.foregroundImage` = `android-adaptive-foreground-1024.png`, `monochromeImage` = `android-adaptive-monochrome-1024.png` (temas do Android 13+), `backgroundColor` = fundo da variante escolhida                                                                                                                                                                                                                                                             |
| Splash                                                                                                                                          | `splash.png`, `#ffffff`                                                                                                                                           | plugin `expo-splash-screen` em `plugins` (`image` = `aecc-symbol-1024.png`, `imageWidth`, `backgroundColor #EEF2F5`, `dark.backgroundColor #08161F`). Remover a chave `splash` de topo. **Confirmar o formato com o plugin Expo na B3**                                                                                                                                                                                                                                         |
| PWA / web                                                                                                                                       | `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `assets/favicon.png`; `manifest.json` com `theme_color #0b6e8f` e `background_color #ffffff` | `pwa-icon-192.png` / `pwa-icon-512.png` → `public/icons/`. `favicon-48.png` → `web.favicon`. Gerar o `apple-touch-icon` (180) a partir da variante escolhida. `theme_color`/`background_color` → `#08161F`. **Os PWA são provisórios (`icon-navy`) e regeram-se se a skill escolher outra variante**                                                                                                                                                                            |
| Nome no login                                                                                                                                   | `app/(auth)/login.tsx:57`: **"Associação de Empresários de Cascais"** (a tarefa indicava a :58; no `main` atual está na 57)                                       | "Associação Empresarial do Concelho de Cascais", como em `app.config.ts`, `manifest.json`, `TopBar` e `index.tsx`                                                                                                                                                                                                                                                                                                                                                               |
| `app.config.ts`                                                                                                                                 | `scheme: 'aecc'` com o comentário "só no branch design/fase2-direcoes", que entrou no `main` pelo PR #18                                                          | decidir na B3: manter o `scheme` (útil para o Maestro e o OAuth nativo) e corrigir o comentário, ou removê-lo                                                                                                                                                                                                                                                                                                                                                                   |
| `src/colors.ts`                                                                                                                                 | comentário a apontar para o `.webp`                                                                                                                               | atualizado na B6                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

## 6. Fase B: ordem de execução

**Em todos os passos:**

- `npm run lint`
- `npx tsc --noEmit`
- `npx playwright test` com **8/8** (precisa da stack E2E do `aecc-api` em `:5080`)
- Output em `.artifacts/`
- Um commit por passo

Nos passos marcados com 📸, regenerar as capturas, corrê-las em iOS 26 + Android com o Maestro (`e2e/maestro/native/smoke-public.yaml`) e **PARAR para aprovação do Salvador** (a Fase 4, mockups, está integrada nestes passos, ver §9). Os passos visuais B3, B6, B8, B10 e B13 arrancam com `/design-taste-frontend-v1`.

### Grupo BASE (sem mudança visual) — branch `redesign/fase3-base`, criado a partir de `design/fase3-design-system`

Termina com um PR para o `main` com o plano, os assets da marca e estes passos (aberto só no fim da B5b).

| Passo   | Conteúdo                                                                                                                                                                                                                                                                                                                                                                             | Verificação extra                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| **B0**  | Limpeza do PR #18: remover `app/prototypes/`, `src/prototypes/` e `assets/fonts/prototypes/{outfit,figtree}`; mover `assets/fonts/prototypes/geist/` para `assets/fonts/geist/`; corrigir o comentário do `scheme` em `app.config.ts` (o `scheme` fica, para o Maestro e o OAuth nativo); esconder o `/favourites` nas tabs atuais (`href: null`) e tirá-lo das capturas da baseline | `grep` sem imports de `prototypes`; 8/8 |
| **B1**  | `src/theme/`: `palette`, `colors` (novos papéis + aliases antigos), `glass`, `typography`, `tokens`, `createStyles`/`useStyles`, `useBreakpoint`. `expo-system-ui` (`npx expo install`). **Sem mudanças visuais** (os aliases apontam para os valores atuais)                                                                                                                        | `tsc`                                   |
| **B2**  | Fontes Geist (`assets/fonts/geist/`) carregadas no `_layout.tsx` raiz ao lado das atuais                                                                                                                                                                                                                                                                                             | Android: arranque sem ecrã branco       |
| **B5**  | Primitivas: `Text`, `Button` (D1/D6), `TextField` (D2), `SearchField` (D3), `Chip`, `IconButton`, `Plate`, `Highlight`, `Skeleton`, `EmptyState`, `ErrorState` (D5), `InlineAlert`, `StateScreen`, `Surface`, `ListGroup`/`ListRow`/`CompanyRow` (D4), `formatAddressLine` (D9). **Sem consumidores**                                                                                | `tsc`                                   |
| **B5b** | `docs/DESIGN.md` (tokens, componentes, regras de uso, vidro por plataforma, motion como especificação) e atualização da regra de precedência no `CLAUDE.md` (arquitetura de estilos decidida, NativeTabs, `GlassSurface`, Geist, fim do `BlurView`). Abrir o PR base para o `main`                                                                                                   | revisão do diff do `CLAUDE.md`          |

### Grupo VISUAL — branch de integração `redesign/fase3-ui`, criado a partir do `main` depois do PR base

Um branch e um PR por passo, com destino `redesign/fase3-ui`. O PR final para o `main` só depois de aprovado.

| Passo      | Conteúdo                                                                                                                                                                                                                                                                                                                             | Verificação extra                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| **B3** 📸  | Marca: `BrandLockup`, substituir os 6 usos do webp e apagá-lo, corrigir o nome no login, ícone/adaptive/splash/PWA, `manifest.json`. **A skill escolhe a variante do ícone**                                                                                                                                                         | Maestro Android: o logo aparece (o erro do webp desaparece)   |
| **B4**     | `GlassSurface` + `GlassGroup` promovidos para `ui/`. `Button`, `CategoryTile`, `TopBar`, a tab bar e o hero migram (**D8**). `expo-blur` deixa de ser importado                                                                                                                                                                      | `grep -rn BlurView app src` = 0                               |
| **B6** 📸  | **Troca de paleta:** os aliases passam a apontar para a Maré. A app inteira muda de cor, e é aqui que as capturas mudam todas                                                                                                                                                                                                        | revisão light/dark                                            |
| **B7** 📸  | Navegação: nova estrutura `(tabs)`, `src/navigation/tabs.ts`, NativeTabs + `_layout.web.tsx`, tabs por papel, `Appearance.setColorScheme`, `TopBar` removido. **Testar o `md` no Android.** Se falhar um critério da §2, aplicar o plano B                                                                                           | Maestro iOS 26 + iOS < 26 + Android; E2E `auth.spec` ajustado |
| **B8** 📸  | T1 Autenticação (5 ecrãs, onde estão 66 das 94 cores hardcoded)                                                                                                                                                                                                                                                                      | Maestro `smoke-public`                                        |
| **B9**     | T2 Estado: callback, not-found, sessão a carregar, sem permissão (`RoleGuard` → `StateScreen`)                                                                                                                                                                                                                                       | E2E: rota protegida sem papel                                 |
| **B10** 📸 | T3 Lista: `/companies` (Horizon, pesquisa, chips, lista agrupada; web 1280 sidebar + Lista \| Tabela + realce), `/my-companies`, `/users`                                                                                                                                                                                            | `directory.spec`, `categories.spec`                           |
| **B11**    | T4 Detalhe: `/companies/:id`, `/products/:id` (lightbox com tokens, `InlineAlert` no lugar de `Alert.alert`)                                                                                                                                                                                                                         | —                                                             |
| **B12**    | T7 Formulários em ecrã: editar empresa, produto, criar utilizador. `Modal` eliminado                                                                                                                                                                                                                                                 | `edit-company.spec` ajustado                                  |
| **B13** 📸 | T5 Início e T6 Perfil (toggle de tema system/light/dark)                                                                                                                                                                                                                                                                             | —                                                             |
| **B14**    | Limpeza: aliases antigos, `Card`, `LoadingSpinner`, `Modal`, `TopBar`, `RoleGuard`, fontes Libre Franklin/Source Sans, as 5 variantes de vidro antigas, remoção do `expo-blur`. Regra ESLint para `StyleSheet.create` em erro. Auditoria de literais: script da §3.3 do inventário, com o objetivo de 0 cores e < 5% de espaçamentos | contagem final no documento                                   |

### 6.1 O que muda nos E2E

- **O contrato são os `testID`** e mantêm-se todos os usados hoje (22 distintos).
- **`auth.spec.ts`:** `topbar.profile` deixa de existir com o `TopBar`. Passa a `tab.profile` (o `testID` do trigger em `_layout.web.tsx`), e a asserção de logout fica `toHaveCount(0)` sobre o mesmo id. Alternativa sem alterar o spec: dar `testID="topbar.profile"` ao trigger do Perfil. **Proposta: renomear, porque é mais honesto.**
- **`edit-company.spec.ts`:** hoje abre o modal em `/my-companies` (`my-companies.edit`). Passa a navegar para `/my-companies/:id/edit`. Os `company-edit.description` / `.save` / `.logo-upload` mantêm-se no ecrã T7.
- **`directory.spec` / `categories.spec`:** `companies.search`, `companies.category-chip-*`, `directory.row` e `directory.empty` mantêm-se nos componentes novos. Os skeletons não podem ter `directory.row`.
- **Novo** (na B9, não conta para os 8/8 até ser aprovado): rota `/users` com o papel Associado → `StateScreen` "sem permissão".

### 6.2 Capturas de referência

- `docs/redesign/baseline/` (web 390/1280 × light/dark, iOS, Android) fica **congelada** como o "antes".
- As capturas "depois" vão para `docs/redesign/fase3/after/`, com o mesmo spec `e2e/web/baseline/screens.spec.ts` e `outputDir` parametrizado (`BASELINE_DIR`). As do `/favourites` saem da lista (a rota está escondida).
- As capturas nativas da B3/B7/B8/B10/B13 vão para `docs/redesign/fase3/after/{ios,android}/`.

---

## 7. Dependências a aprovar

| #   | Dependência             | Versão                                                                                           | Estado                     | Justificação                                                                                                                                                                                                                                |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —   | **nenhuma obrigatória** | —                                                                                                | —                          | A (a) e as NativeTabs vêm com o RN e o `expo-router ~55.0.18`. O `expo-glass-effect ~55.0.11` já está instalado (aprovado na fase 2). Geist e os paths Phosphor são ficheiros locais                                                        |
| 1   | `expo-system-ui`        | `~55.x` via `npx expo install expo-system-ui` (versão exata a confirmar pelo `npx expo install`) | **aprovada** (entra na B1) | Pinta o fundo da janela raiz com `bg` (`#08161F` em dark), o que evita o flash branco no arranque, nas transições e com o teclado no Android quando `userInterfaceStyle: 'automatic'`. Sem ela, fica o branco do sistema por trás das views |
| 2   | **remover** `expo-blur` | `~55.0.18`                                                                                       | a aprovar                  | **Aprovada.** Fica sem consumidores depois da B4. Remoção na B14                                                                                                                                                                            |

**Não pedir agora:**

- `react-native-unistyles` e `react-native-nitro-modules` (§1).
- `nativewind` e `tailwindcss` (§1, proibidos).
- `react-native-reanimated`, `react-native-gesture-handler`, `react-native-worklets` e `expo-haptics` (fase de motion).
- `expo-symbols` (desnecessário: o `sf` das NativeTabs é nativo).
- `react-native-svg-transformer` (§5).
- `@expo/ui`.
- `expo-linear-gradient` (o `horizon` é sólido).

---

## 8. Validação desta fase

Output literal no relatório da tarefa. Os ficheiros novos neste branch são só `docs/redesign/fase3-plano.md` e `assets/brand/redesign-2026/**`.

---

## 9. Decisões e integração

**Decisões aprovadas a 15/11/2026:**

1. **Estilos:** `createStyles` + `useStyles` (§1.2). **Navegação:** NativeTabs + `_layout.web.tsx` (§2.2). Aprovados.
2. **Fase 4 (mockups) integrada:** não há mockups separados. Cada passo 📸 termina com as capturas e **PARA para aprovação do Salvador**.
3. **Integração em dois grupos:**
   - **BASE** (sem mudança visual) em `redesign/fase3-base`, criado a partir de `design/fase3-design-system`: B0, B1, B2, B5 e B5b. No fim, um PR para o `main` com o plano, os assets da marca e estes passos.
   - **VISUAL** em `redesign/fase3-ui`, criado a partir do `main` depois do PR base: B3, B4, B6–B13 e, no fim, B14. Um branch e um PR por passo, com destino `redesign/fase3-ui`. O PR final para o `main` só depois de aprovado.
4. **Dependências aprovadas:** `expo-system-ui` (`npx expo install`, entra na B1) e a remoção do `expo-blur` (na B14).
5. **Login nativo:** o refactor vem depois da B8, sobre o ecrã T1 novo. **Fora desta fase.**
6. **Passos visuais** (B3, B6, B8, B10, B13): o Salvador arranca cada um com `/design-taste-frontend-v1`. Na B3, a skill escolhe a variante do ícone.
7. **`scheme: 'aecc'`** fica em `app.config.ts` (Maestro e OAuth nativo); só se corrige o comentário (B0).

**Regras de execução:** um passo por sessão; nunca push para o `main` nem merge de PRs; push só de branches `redesign/*` e só quando um passo pedir PR; sem dependências além das aprovadas.

### Estado da Fase B

Esta tabela é atualizada no fim de cada passo e é a partir dela que se retoma depois de cada `/clear`. A versão de referência vive no branch do passo em curso.

| Passo | Branch                                                        | Commit    | PR    | Estado                                                                                                         |
| ----- | ------------------------------------------------------------- | --------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| B0    | `redesign/fase3-base`                                         | `7570e3a` | —     | concluído (lint 0 erros, tsc ok, Playwright 8/8)                                                               |
| B1    | `redesign/fase3-base`                                         | `db73210` | —     | concluído (lint 0 erros, tsc ok, Playwright 8/8)                                                               |
| B2    | `redesign/fase3-base`                                         | `63aac35` | —     | concluído (lint 0 erros, tsc ok, Playwright 8/8; Android: arranque sem ecrã branco por validar)                |
| B5    | `redesign/fase3-base`                                         | `889ff1f` | —     | concluído (lint 0 erros, tsc ok, Playwright 8/8; primitivas em `src/components/ds/`, ver nota B5)              |
| B5b   | `redesign/fase3-base`                                         | `9517048` | #19   | concluído (lint 0 erros, tsc ok, Playwright 8/8; PR base em draft, sem merge)                                  |
| B3    | `redesign/fase3-b3-marca` → `redesign/fase3-ui`               | `d846cd9` | #20   | **aprovado** a 15/11/2026 (lint 0 erros, tsc ok, Playwright 8/8; PR #20 ainda por fazer merge; ver nota B3)    |
| B4    | `redesign/fase3-b4-glass` (sobre o B3) → `redesign/fase3-ui`  | `6dcab91` | —     | **à espera de revisão** (lint 0 erros, tsc ok, Playwright 8/8; `grep BlurView app src` = 0; ver nota B4)       |
| B6    | `redesign/fase3-b6-paleta` (sobre o B4) → `redesign/fase3-ui` | `COMMIT`  | PRNUM | **à espera de revisão** (lint 0 erros, tsc ok, Playwright 8/8; capturas web em `fase3/after/web`; ver nota B6) |
| B7    | idem                                                          | —         | —     | pendente                                                                                                       |
| B8    | idem                                                          | —         | —     | pendente                                                                                                       |
| B9    | idem                                                          | —         | —     | pendente                                                                                                       |
| B10   | idem                                                          | —         | —     | pendente                                                                                                       |
| B11   | idem                                                          | —         | —     | pendente                                                                                                       |
| B12   | idem                                                          | —         | —     | pendente                                                                                                       |
| B13   | idem                                                          | —         | —     | pendente                                                                                                       |
| B14   | idem                                                          | —         | —     | pendente                                                                                                       |

**Nota B5:** as primitivas vivem em `src/components/ds/` (e não em `ui/`, como a §4.2 previa) porque `Button`, `Chip`, `IconButton`, `EmptyState` e `ErrorState` já existem em `ui/` com consumidores; reescrevê-los no sítio mudaria o visual. A B14 apaga os antigos e move `ds/` para `ui/`. `glassStyle.ts` aproxima o vidro (web: tint + `backdrop-filter`; nativo: sólido + hairline) até ao `GlassSurface` real da B4. O `IconButton` de contacto só tem os ícones existentes (sem telefone/email): os paths Phosphor Bold entram com o `Icon` novo (§3.6). `formatAddressLine` está em `src/utils/address.ts` e ainda não substitui os 2 `buildAddressLine` (migração nos passos visuais).

**Nota B3:** ícone = `icon-navy-deep` (fundo `#0C3247`, o mais próximo do dark da Maré e com o melhor contraste das quatro faixas em tamanhos pequenos). Adaptive Android: foreground + monocromático, `backgroundColor #0C3247`. Splash: plugin `expo-splash-screen` (já instalado) com `aecc-symbol-1024.png`, fundo `#EEF2F5` / dark `#08161F`. PWA 192/512, `apple-touch-icon` (180) e favicon regerados a partir do `icon-navy-deep` (os do pacote eram do `icon-navy`); `manifest.json` com `#08161F`. `BrandLockup` está em `src/components/ds/` e usa **cópias sem `@3x`** em `assets/brand/aecc-logo-{light,dark}.png`: o `expo export -p web` emite `…@3x.png` mas escreve o URI sem o sufixo (404 no web). Nos ecrãs de login/registo o lockup fica fixo em `variant="light"` porque o fundo é `#fff` fixo até à B8. As metas `theme-color` de `index.html` ficam para a B6 (seguem a paleta atual). Dev build nativo sem `expo-dev-client`: o Metro tem de estar na porta **8081** (a app não procura outra).

**Nota B4:** `GlassSurface`/`GlassGroup`/`useGlassCapability` em `src/components/ui/GlassSurface.tsx` (`ds/glassStyle.ts` apagado; `glassStyle` vive agora ali e `ds/Button|Chip|SearchField` importam-no). Migraram para `GlassSurface`: `ui/Button`, `CategoryTile`, `TopBar` (barra, toggle de tema, chip de perfil), tab bar, hero (`opaque` + `elevated`), pesquisa e poços de value props do Início e a pesquisa de `/companies`. Diferença visual conhecida: fora do iOS 26 o vidro de cada controlo passou a ser o material único (web: tint + filter; nativo: sólido) e as variantes com ênfase (`primary`/`gold`/`destructive`, tile ativo) usam `tintColor` opaco em vez do tint a 86–90% sobre blur; não há sombra no nativo. As 5 variantes de `glass.ts` ficam sem consumidores, `@deprecated`, até à B14. Não foi validado em iOS 26 nem Android (Maestro por correr). Sem runner de testes unitários no projeto, a verificação é tsc/lint/grep/E2E.

**Nota B6:** `colors.ts` passou a gerar os dois esquemas a partir de `palette.ts` e os aliases antigos apontam para a Maré (`surfaceApp→bg`, `surfaceCard→surface`, `surfaceSunken/Raised→raised`, `border*→border` com `borderStrong→text3`, `text*→text/text2/text3`, `accentPrimary`/`accentGold→accent`, `textOn*→onAccent`, `textLink→accentText`, `featured→accent/accentSoft`, `heroScrim*→bg` translúcido). Como o dourado `#DCAA45` não tem contraste como texto em light, os usos de `accentPrimary` como cor de texto/ícone (TopBar, tab ativa, links, ícones, `Button` secondary/ghost, `IconButton`) passaram a `accentText` (`#85600F` em light, igual em dark); preenchimentos e bordas ficam em `accent`. `Badge` info usa `info`. `warning` fica laranja (`#F0A35E` / `#A8560F`), validado. `index.html` (`theme-color`, `--aecc-surface-app`, `--aecc-focus-ring`) segue a Maré; `manifest.json` já estava em `#08161F` desde a B3. Sem capturas nativas (o plano só as pede em B3/B7/B8/B10/B13); iOS 26/Android por validar.
