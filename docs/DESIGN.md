# Design system — AECC (direção B · Maré)

Referência viva do design system. A análise e as decisões que o originaram estão em `docs/redesign/fase3-plano.md` (e `docs/redesign/fase2-direcoes.md` para a direção). **Estado:** a base (tokens, `useStyles`, primitivas) existe; os ecrãs ainda usam os aliases antigos até à B6+ (ver "Estado da migração").

Stack: Expo SDK 55 + React Native + react-native-web. Sem Tailwind nem NativeWind. Sem dependências de animação.

---

## 1. Princípios

- **A Maré é dark-first**, mas o esquema por omissão é o do sistema.
- **Um material, não cinco:** o vidro é um único material (`theme.material`). O chip ativo é o mesmo vidro com `tintColor = accent`.
- **Papéis, não valores:** nenhum literal de cor, espaçamento, raio ou tamanho de fonte nos ecrãs. Tudo vem de `useTheme()` / `useStyles()`.
- **Menos caixas:** agrupar com `ListGroup` e hairlines; `Surface` só onde a elevação comunica hierarquia.
- **Sem sombra no nativo:** a profundidade vem do material. `boxShadow` só no web.
- **`borderCurve: 'continuous'`** em todos os cantos arredondados.

---

## 2. Estilos: `createStyles` + `useStyles`

```tsx
import { createStyles, useStyles } from '@/theme/createStyles';

// Uma factory por ficheiro, no topo do módulo (referência estável para a memoização).
const factory = createStyles(({ colors, radii, spacing }) => ({
  box: { backgroundColor: colors.surface, borderRadius: radii.group, padding: spacing.lg },
}));

export function Thing() {
  const s = useStyles(factory); // StyleSheet.create(factory(theme)), memoizado por esquema
  return <View style={s.box} />;
}
```

- Estilos que dependem de estado (pressed, focused, erro) vão inline ou em arrays com o token do papel.
- `useTheme()` continua a ser o único ponto de acesso ao tema. Nunca importar a paleta (`palette.ts` é privada ao `theme`).
- Regra ESLint para `StyleSheet.create` solto: B14.

---

## 3. Tokens (`src/theme/`)

| Ficheiro           | Conteúdo                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `palette.ts`       | valores brutos da Maré (privado)                                                              |
| `colors.ts`        | `ThemeColors` por papel + aliases antigos `@deprecated` (apagados na B14)                     |
| `glass.ts`         | `GlassMaterial` por esquema (+ as 5 variantes antigas, apagadas na B4)                        |
| `typography.ts`    | família Geist, `textStyles`, `tabular`, `inputMin`                                            |
| `tokens.ts`        | `spacing`, `radii`, `size`, `border`, `opacity`, `breakpoints`, `layout`, `glassShadow` (web) |
| `createStyles.ts`  | `createStyles` / `useStyles`                                                                  |
| `useBreakpoint.ts` | `sm` < 768 · `md` ≥ 768 · `lg` ≥ 1280                                                         |
| `ThemeContext.tsx` | `ThemeProvider` / `useTheme`                                                                  |

### Cor (papéis)

| Papel                                | Uso                                               |
| ------------------------------------ | ------------------------------------------------- |
| `bg`                                 | fundo da app                                      |
| `horizon`                            | faixa de topo por trás do vidro                   |
| `surface`                            | grupos de lista, painéis, campos                  |
| `raised`                             | skeleton, press, hover, cabeçalho de tabela       |
| `border`                             | hairlines                                         |
| `text` / `text2` / `text3`           | texto principal / secundário (`meta`) / terciário |
| `accent` / `accentPressed`           | ação primária, chip ativo                         |
| `accentText`                         | texto em dourado (contraste AA no light)          |
| `onAccent`                           | texto sobre o acento                              |
| `accentSoft` / `accentSoftText`      | realce do termo, iniciais                         |
| `logoPlate`                          | fundo dos logos de terceiros                      |
| `error` / `success` / `info` (+`Bg`) | só estados                                        |
| `scrim`                              | lightbox, diálogos                                |

Notas: `error`/`success`/`info`/`warning`/`focusRing` mantêm os valores antigos até à B6. `warning` na Maré é **provisório** (validar na B6). Links são `text` sublinhado (sem `textLink`). Âncora dourada `#DCAA45`; sobre ela usar sempre `onAccent`, e `accentText` quando o dourado é texto sobre superfície clara.

### Tipografia

Geist (400/500/600/700), carregada no `_layout.tsx` raiz com os nomes `Geist_400Regular`, `Geist_500Medium`, `Geist_600SemiBold`, `Geist_700Bold`.

| Variante  | Tamanho/linha | Peso | Notas                      |
| --------- | ------------- | ---- | -------------------------- |
| `hero`    | 30/34         | 700  | tracking −0,6              |
| `title`   | 24/30         | 600  | detalhe, T2                |
| `heading` | 20/26         | 600  |                            |
| `name`    | 16/22         | 600  | nome de empresa, botões    |
| `body`    | 15/22         | 400  |                            |
| `meta`    | 13/18         | 500  | cor `text2` por omissão    |
| `label`   | 12/16         | 600  | tracking +0,4, cor `text2` |

`tabular` para números; inputs com mínimo `inputMin = 16` (evita o auto-zoom do Safari iOS).

### Espaçamento, raios, tamanhos

- **spacing:** `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 28 · 4xl 32 · 5xl 40 · 6xl 48` (e `2xs 2`). As chaves numéricas antigas são `@deprecated`.
- **radii:** `xs 6` (barras de skeleton) · `sm 10` · `plate 12` · `control 14` (botões, campos) · `group 20` (superfícies, painéis) · `capsule 999` (pesquisa, chips).
- **size:** `icon {16,20,24,28}` · `hitTarget 44` · `plate {32,48,96}` · `row {mobile 72, web 64, table 48}` · `search 52`.
- **layout:** `gutter 20` · `sectionGap 28` · `maxWidth 1240` · `horizonHeight 200` · `searchOverlap −26`.
- **opacity:** `disabled 0.45`. **border:** `hairline` · `default 1` · `accentBar 3`.

---

## 4. Vidro por plataforma

| Plataforma                             | Render                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| iOS 26 (Reduce Transparency desligado) | `GlassView` (`expo-glass-effect`); `GlassGroup` = `GlassContainer` para fundir vidros vizinhos |
| iOS < 26, Reduce Transparency, Android | superfície sólida `material.solid` + hairline `material.border` (sem sombra)                   |
| Web                                    | `material.tint` + `backdropFilter: material.webFilter` + `boxShadow` com `glassShadow(...)`    |

Regras: sem `overflow: 'hidden'` no `GlassView`; legibilidade garantida pelo fallback sólido; nunca texto fino sobre vidro sem contraste verificado.

**Hoje (B4):** `src/components/ui/GlassSurface.tsx` exporta `GlassSurface`, `GlassGroup`, `useGlassCapability` e `glassStyle` (o fallback). iOS 26 com Liquid Glass disponível e sem "Reduzir transparência" usa `GlassView`/`GlassContainer`; iOS < 26, Android e web usam o fallback (web: tint + `backdrop-filter`; nativo: sólido + hairline). A ênfase vem de `tintColor` e o `opaque` dá sólido onde é preciso contraste AA (hero). Nenhum ficheiro importa `BlurView`; o pacote `expo-blur` só sai na B14.

---

## 5. Componentes (`src/components/ds/`)

Vivem em `ds/` até à B14 (`ui/` ainda tem os antigos, com consumidores); depois movem-se para `ui/`.

| Componente                  | Papel                                                                                     | Resolve |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------- |
| `Text`                      | `variant`, `color` (papel), `tabular`                                                     |         |
| `Button`                    | `primary` · `secondary` · `glass` · `destructive`; `sm`/`md`; `loading`                   | D1, D6  |
| `IconButton`                | `plain` ou `contact`; `label` obrigatório (acessibilidade)                                |         |
| `TextField`                 | label por cima, hint/erro por baixo, foco, mínimo 16px; erro com `testID` `<campo>-error` | D2      |
| `TextLink`                  | link = `text` sublinhado; `accentText` só no hover (web) / press; alvo 44                 |         |
| `SearchField`               | cápsula de vidro de 52px com limpar                                                       | D3      |
| `Chip`                      | cápsula; ativo = acento                                                                   |         |
| `Surface`                   | sólida (`surface`/`raised`), raio `group`; substitui `Card`                               |         |
| `ListGroup` / `ListRow`     | grupo com hairline indentada, chevron, press                                              | D4      |
| `CompanyRow`                | `Plate` + nome + meta com realce, sobre `ListRow`                                         | D4      |
| `Plate`                     | logo sobre `logoPlate` ou iniciais; `sm`/`md`/`lg`                                        |         |
| `Highlight`                 | realce do termo, sem acentos nem maiúsculas                                               |         |
| `Skeleton` / `SkeletonRow`  | geometria da linha; **sem `testID` `directory.row`**                                      |         |
| `EmptyState` / `ErrorState` | instruções concretas / painel inline com retry                                            | D5      |
| `InlineAlert`               | erro ou sucesso de uma ação (no lugar de `Alert.alert`)                                   |         |
| `StateScreen`               | T2: carregar sessão, não encontrado, sem permissão                                        |         |

Templates (`src/components/templates/`): `AuthScaffold` + `AuthPrompt` (T1, B8): `sm` com faixa `horizon` e formulário numa `Surface` a sobrepor a borda (−26); `md+` split 5fr/7fr com o painel da marca à esquerda e o formulário numa coluna de `layout.formMaxWidth` (400) alinhada à esquerda. `StateTemplates` (T2, B9): `SessionLoadingState`, `ForbiddenState` (rota sem papel, no sítio e sem redirect) e `NotFoundState`, sobre `StateScreen`; o `useRequireRole` não redireciona.

Utilitários: `formatAddressLine` (`src/utils/address.ts`, D9), `splitByTerm` / `initials` (`src/utils/text.ts`), `useBreakpoint`.

T3 (B10): `Horizon` (faixa `horizon` com título, `meta` e `aside`; lockup só onde não há outra marca), `SegmentedControl` (Lista \| Tabela, web `lg`), `DataTable` (cabeçalho `raised` _sticky_, linhas de 48) e o template `ListScaffold` (horizonte → elemento a −26 → conteúdo; `lg` com sidebar 1fr/3fr). Raízes T3 no nativo: sem header do `Stack` e `managesInsets` na tab (`src/navigation/tabs.ts`), porque as NativeTabs somam o inset automático ao horizonte no iOS.

Por construir (passos visuais): `Screen`, `FormLayout` (B12).

### Regras de uso

- **`testID`s são o contrato dos E2E.** Mantêm-se todos (22 distintos). Skeletons não podem ter `directory.row`.
- Botões: um `primary` por ecrã; `destructive` só para ações irreversíveis (a confirmação fica no `Alert.alert` / `window.confirm`).
- Feedback de ação num formulário: `InlineAlert` ou `TextField error`, nunca só cor.
- Alvos táteis ≥ 44 (`size.hitTarget`); botões `sm` usam `hitSlop`.
- Listas: `ListGroup` + `CompanyRow` + `SkeletonRow` no carregamento; `EmptyState` com a próxima ação; `ErrorState` com retry.
- Hover só no build web.

---

## 6. Navegação (decidida, B7)

`NativeTabs` (`expo-router/unstable-native-tabs`) no iOS e no Android; `_layout.web.tsx` com as tabs headless do `expo-router/ui` no web. Configuração única em `src/navigation/tabs.ts` (`name, label, sf, md, icon, roles`), consumida pelos dois layouts. Papel resolvido antes de montar as tabs. `Appearance.setColorScheme` propaga o tema manual ao nativo. Plano B (se a B7 falhar um critério): JS `Tabs` com `tabBar` própria sobre `GlassSurface`.

---

## 7. Motion — só especificação

Sem `react-native-reanimated` aprovado, **não há código de animação** nem `motion.ts`.

| Interação            | Nativo (animate-expo)                                                                  | Web (apple-design)                               |
| -------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Press de linha/botão | hoje: troca de tom (`raised` / `accentPressed`); depois `scale 0.98` com spring rápido | resposta imediata no pointer-down, interrompível |
| Chip ativo           | morph do `GlassContainer` (iOS 26, sem código)                                         | troca de tint, sem transição CSS                 |
| Tab bar              | comportamento do sistema                                                               | sem animação                                     |
| Skeleton             | estático; shimmer na fase de motion                                                    | idem                                             |
| Reduce Motion        | desliga tudo exceto opacidade                                                          | `prefers-reduced-motion` via `AccessibilityInfo` |

---

## 8. Estado da migração

| Passo  | Estado                                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| B1     | tema novo + aliases antigos (sem mudança visual)                                                                                               |
| B2     | Geist carregada                                                                                                                                |
| B5     | primitivas em `ds/`, sem consumidores                                                                                                          |
| B3–B13 | ecrãs migram para `ds/`; B6 troca a paleta                                                                                                     |
| B14    | apaga aliases, componentes antigos, fontes antigas, `expo-blur`; regra ESLint; auditoria de literais (objetivo: 0 cores, < 5% de espaçamentos) |

A tabela canónica por passo está em `docs/redesign/fase3-plano.md` §9.
