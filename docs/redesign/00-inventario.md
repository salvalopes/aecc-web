# Fase 0A — Inventário (aecc-web)

**Data:** 2026-11-13 · **Branch:** `main` · **Commit:** ver `git rev-parse HEAD`
**Natureza:** só leitura. Nenhum ficheiro existente foi alterado; o único ficheiro novo é este.

**Âmbito analisado:** `app/` (Expo Router) + `src/`, ficheiros `.ts`/`.tsx`.
`node_modules/`, `dist/`, `.expo/` e `public/` ficam fora das contagens (exceto onde explicitamente indicado).

```bash
# ponto de partida — lista de ficheiros analisados (54)
find app src -type f \( -name '*.tsx' -o -name '*.ts' \) | sort
# subconjunto usado na auditoria de tokens (exclui as definições de tokens)
find app src -type f \( -name '*.tsx' -o -name '*.ts' \) ! -path 'src/theme/*' | sort
```

---

## 1. Inventário de ecrãs

### 1.1 Estrutura de rotas

```bash
find app -type f | sort
```

```
app/_layout.tsx                                  ← layout raiz (Stack, headerShown:false)
app/(app)/_layout.tsx                            ← layout autenticado (Tabs + guarda de sessão)
app/(auth)/_layout.tsx                           ← layout de autenticação (Stack, headerShown:false)
app/(app)/index.tsx
app/(app)/companies/index.tsx
app/(app)/companies/[id].tsx
app/(app)/companies/category/[categoryId].tsx
app/(app)/products/[id].tsx
app/(app)/favourites/index.tsx
app/(app)/profile/index.tsx
app/(app)/my-companies/index.tsx
app/(app)/users/index.tsx
app/(auth)/login.tsx
app/(auth)/register.tsx
app/(auth)/forgot-password.tsx
app/auth/callback.tsx
app/confirm-email.tsx
app/reset-password.tsx
app/+not-found.tsx
```

**19 ficheiros = 3 layouts + 16 ecrãs.** Os grupos `(app)` e `(auth)` não aparecem no URL.

### 1.2 Layouts e grupos

| Ficheiro | Tipo | O que faz |
|---|---|---|
| `app/_layout.tsx` | `Stack` | Carrega as 2 fontes variáveis (`LibreFranklin`, `SourceSans3`), esconde o splash, envolve tudo em `ThemeProvider` → `NavigationThemeProvider` (tokens injetados no tema do React Navigation) → `AuthProvider`. `headerShown: false`. |
| `app/(app)/_layout.tsx` | `Tabs` | Guarda de sessão (`!token` → `router.replace('/(auth)/login')`). Tab bar de vidro (`BlurView` + tint `glass.panel`), 6 separadores com visibilidade por papel via `href: null`. `header: renderTopBar` nos 6 roots; ecrãs de detalhe usam `headerLeft: HeaderLogo`. |
| `app/(auth)/_layout.tsx` | `Stack` | 5 linhas, `headerShown: false`. Sem branding nem estado próprio. |

**Visibilidade dos separadores** (`app/(app)/_layout.tsx:40-42`):

| Separador | Rota | Condição |
|---|---|---|
| Início | `/` | sempre |
| Empresas | `/companies` | sempre |
| Favoritos | `/favourites` | sempre |
| Perfil | `/profile` | sempre |
| Editar | `/my-companies` | `role ∈ {Associado, Admin}` |
| Utilizadores | `/users` | `role === 'Admin'` |

### 1.3 Ecrãs

Legenda de estados: **L** = loading · **V** = vazio · **E** = erro (+retry) · **P** = sem permissão.

| # | Rota | Ficheiro | Propósito (1 linha) | Utilizador | L | V | E | P |
|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 1 | `/` | `app/(app)/index.tsx` | Hero de vidro com pesquisa, 4 value props, grelha de 8 categorias e 3 empresas em destaque. | autenticado (qualquer papel) | ✅ `LoadingSpinner` | ❌ (listas vazias renderizam nada) | ✅ bloco inline `errorWrap` + "Tentar novamente" | n/a |
| 2 | `/companies` | `app/(app)/companies/index.tsx` | Diretório único pesquisável: campo de pesquisa + chips de categoria + lista paginada. | autenticado | ✅ (via `CompanyDirectoryList`) | ✅ (via `EmptyState`) | ✅ (via `ErrorState`); falha dos chips é silenciosa | n/a |
| 3 | `/companies/:id` | `app/(app)/companies/[id].tsx` | Detalhe da empresa + lista de produtos/serviços; dono edita dados, logo e cria produtos. | autenticado; edição só se `company.ownerUserId === user.id` | ✅ | ✅ `ListEmptyComponent` | ✅ `ErrorState` + retry | ⚠️ implícito — ações de edição simplesmente não aparecem (`isOwner`), sem mensagem |
| 4 | `/companies/category/:categoryId` | `app/(app)/companies/category/[categoryId].tsx` | Rota legacy — `<Redirect>` para `/companies` com `categoryId` pré-aplicado. 9 linhas, sem UI. | autenticado | n/a | n/a | n/a | n/a |
| 5 | `/products/:id` | `app/(app)/products/[id].tsx` | Detalhe do produto/serviço, galeria (até 15 imagens, lightbox), benefício de associado; dono edita/apaga/destaca imagens. | autenticado; edição só `isOwner` | ✅ | n/a | ✅ `ErrorState` + retry | ⚠️ implícito (`isOwner`) |
| 6 | `/favourites` | `app/(app)/favourites/index.tsx` | **Placeholder** — não existe entidade `Favourite` na API; separador visível por pedido do cliente. 15 linhas. | autenticado | ❌ | ✅ `EmptyState "Em breve."` | ❌ | n/a |
| 7 | `/profile` | `app/(app)/profile/index.tsx` | Nome / email / papel + botão "Terminar sessão". 33 linhas, sem edição. | autenticado | ❌ | ❌ (mostra `'—'`) | ❌ | n/a |
| 8 | `/my-companies` | `app/(app)/my-companies/index.tsx` | Lista das empresas de que o utilizador é dono + modal de edição (nome, descrição, email de leads, cooldown). | **Associado / Admin** (`RoleGuard`) | ✅ | ✅ `EmptyState "Ainda não tem empresas."` | ✅ `ErrorState` + retry | ⚠️ `RoleGuard` → spinner e redirect; **sem ecrã de "sem permissão"** |
| 9 | `/users` | `app/(app)/users/index.tsx` | Gestão de utilizadores: listar, criar, mudar papel, ativar/desativar, apagar. | **Admin** (`RoleGuard`) | ✅ | ✅ `EmptyState "Sem utilizadores."` | ✅ `ErrorState` + retry | ⚠️ idem — redirect silencioso |
| 10 | `/login` | `app/(auth)/login.tsx` | Email + password → `POST /auth/login` (cookie) → PKCE → redirect do browser. | **público** | ✅ `ActivityIndicator` dentro do botão | n/a | ✅ erros por campo + `formError` | n/a |
| 11 | `/register` | `app/(auth)/register.tsx` | Pede email, mostra ecrã "verifica o teu email". | **público** | ✅ inline | n/a | ✅ por campo + `formError` | n/a |
| 12 | `/forgot-password` | `app/(auth)/forgot-password.tsx` | Pede email e mostra sempre sucesso genérico (não revela se o email existe). | **público** | ✅ inline | n/a | ⚠️ `catch {}` vazio — nunca mostra erro, por desenho | n/a |
| 13 | `/auth/callback` | `app/auth/callback.tsx` | Troca `code`+`state` do PKCE por token e redireciona para `/companies`. | **público** (fluxo OAuth) | ✅ `ActivityIndicator` em ecrã cheio | n/a | ✅ mensagem + botão | n/a |
| 14 | `/confirm-email` | `app/confirm-email.tsx` | Define nome + password a partir do link de convite e entra. | **público** (link por email) | ✅ inline | n/a | ✅ por campo + ✅ estado "link inválido: parâmetros em falta" | n/a |
| 15 | `/reset-password` | `app/reset-password.tsx` | Nova password a partir do link de recuperação + ecrã de sucesso. | **público** (link por email) | ✅ inline | n/a | ✅ `displayError` + "link inválido" + "pedir novo link" | n/a |
| 16 | `*` (catch-all) | `app/+not-found.tsx` | "Página não encontrada" + link para `/`. 22 linhas. | qualquer | n/a | n/a | n/a | n/a |

### 1.4 Observações sobre estados

- **Não existe nenhum ecrã verdadeiramente público dentro de `(app)`.** `app/(app)/_layout.tsx:46-50` redireciona qualquer sessão sem token para `/login`. O diretório de empresas **não** é navegável sem conta.
- **`RoleGuard` não tem UI de "sem permissão"** (`src/components/RoleGuard.tsx:30`): quando `allowed === false` devolve `null` e o `useRequireRole` faz `router.replace(fallback)`. Em 2 ecrãs (`/my-companies`, `/users`) isto é um salto silencioso, sem explicação ao utilizador.
- **Loading de sessão renderiza `null`** (`app/(app)/_layout.tsx:52-53`) — ecrã em branco, não um esqueleto.
- **`/` não tem estado vazio.** Se `categories` ou `companies` vierem vazios da API, as secções "Categorias" e "Empresas em destaque" aparecem com cabeçalho e nada por baixo.
- **Nenhum ecrã tem skeleton/shimmer** — todos usam `ActivityIndicator`.
- **Erros de ação (gravar/apagar/upload)** usam `Alert.alert` nativo em 6 pontos de `companies/[id].tsx` e `products/[id].tsx`, não a UI tokenizada.

### 1.5 Variantes específicas de plataforma

```bash
find app src -type f \( -name '*.web.tsx' -o -name '*.ios.tsx' -o -name '*.android.tsx' \
  -o -name '*.native.tsx' -o -name '*.web.ts' -o -name '*.ios.ts' -o -name '*.android.ts' \) | sort
```

**Resultado: nenhuma. Zero ficheiros com sufixo de plataforma.** As diferenças de plataforma são tratadas em runtime com `Platform.OS`:

```bash
grep -rn "Platform.OS" app src --include="*.tsx" --include="*.ts"
```

| Local | O que trata |
|---|---|
| `src/theme/ThemeContext.tsx:68` | Reescreve as CSS custom properties `--aecc-surface-app` / `--aecc-focus-ring` em `public/index.html` (só web) |
| `src/components/ui/Modal.tsx:27` | Scroll-lock do `body` (só web; RNW `Modal` não tem lock próprio) |

Há também correções web embutidas em comentários/código: `minWidth: 0` em flex items (RNW compila para flexbox CSS real — `TopBar.tsx`), `autoComplete="off"` no campo de pesquisa do hero (dropdown do Safari), e `fontSize` mínimo de 16px nos inputs (auto-zoom do Safari iOS — `Input.tsx:64`).

---

## 2. Inventário de componentes

```bash
# existência
find src/components -type f | sort
# uso por componente (ficheiros distintos que o usam em JSX, excluindo a própria definição)
for c in Icon Button IconButton Input Switch Chip Badge Card CategoryTile Modal \
         EmptyState ErrorState LoadingSpinner TopBar CompanyDirectoryList ImageLightbox RoleGuard; do
  all=$(grep -rlE "<${c}([[:space:]/>]|$)" app src --include="*.tsx" \
        | grep -v -e "components/ui/${c}.tsx" -e "components/${c}.tsx" | sort)
  echo "$c | ecrãs: $(echo "$all" | grep -c '^app/') | outros: $(echo "$all" | grep -c '^src/')"
done
```

> Nota sobre o regex: o `|$` final é obrigatório — vários componentes são usados em JSX multi-linha (`<Input\n  label=...`), e `grep` é orientado a linhas.

### 2.1 Primitivas (`src/components/ui/`)

| Componente | Ficheiro | LOC | Ecrãs | Outros comp. | Total ficheiros |
|---|---|--:|--:|--:|--:|
| `Icon` | `ui/Icon.tsx` | 124 | 6 | 6 | **12** |
| `Button` | `ui/Button.tsx` | 133 | 6 | 3 | **9** |
| `LoadingSpinner` | `ui/LoadingSpinner.tsx` | 15 | 5 | 2 | **7** |
| `Card` | `ui/Card.tsx` | 33 | 4 | 1 | **5** |
| `Modal` | `ui/Modal.tsx` | 103 | 4 | 1 | **5** |
| `EmptyState` | `ui/EmptyState.tsx` | 15 | 4 | 1 | **5** |
| `ErrorState` | `ui/ErrorState.tsx` | 28 | 4 | 1 | **5** |
| `Input` | `ui/Input.tsx` | 87 | 4 | 0 | **4** |
| `Chip` | `ui/Chip.tsx` | 43 | 4 | 0 | **4** |
| `Badge` | `ui/Badge.tsx` | 31 | 3 | 0 | **3** |
| `Switch` | `ui/Switch.tsx` | 21 | 3 | 0 | **3** |
| `IconButton` | `ui/IconButton.tsx` | 44 | 1 | 1 | **2** |
| `CategoryTile` | `ui/CategoryTile.tsx` | 109 | 1 | 0 | **1** |
| `TopBar` | `ui/TopBar.tsx` | 120 | 1 | 0 | **1** |

### 2.2 Compostos (`src/components/`)

| Componente | Ficheiro | LOC | Usado em | Total |
|---|---|--:|---|--:|
| `CompanyDirectoryList` | `components/CompanyDirectoryList.tsx` | 174 | `/companies` | **1** |
| `ImageLightbox` | `components/ImageLightbox.tsx` | 100 | `/products/:id` | **1** |
| `RoleGuard` | `components/RoleGuard.tsx` | 34 | `/my-companies`, `/users` | **2** |

**Total: 17 componentes** (14 primitivas + 3 compostos), todos exportados por `src/components/ui/index.ts` exceto os 3 compostos.

### 2.3 Sub-componentes locais (não extraídos, definidos dentro de ecrãs)

```bash
grep -rnE "^function [A-Z]" app src --include="*.tsx"
```

| Nome | Ficheiro | Nota |
|---|---|---|
| `HeaderLogo` | `app/(app)/_layout.tsx:9` | 4.ª variante do lockup da marca |
| `TabLabel` | `app/(app)/_layout.tsx:24` | font-size responsivo hardcoded (`10/11/12`) |
| `SectionHeader` | `app/(app)/index.tsx:26` | só usado 2× no mesmo ecrã |
| `ProductItem` | `app/(app)/companies/[id].tsx:48` | linha de produto |
| `MyCompanyCard` | `app/(app)/my-companies/index.tsx:27` | card de empresa (variante 3) |
| `CompanyDirectoryRow` | `src/components/CompanyDirectoryList.tsx:16` | card de empresa (variante 2) |
| `UserRow` | `app/(app)/users/index.tsx:49` | linha de utilizador |

### 2.4 Duplicados funcionais — **9 identificados**

| # | Duplicação | Canónico | Cópias | Comando |
|---|---|---|---|---|
| **D1** | **Botão** | `ui/Button.tsx` (vidro, tokenizado) | `TouchableOpacity` + `styles.button`/`styles.buttonOutline` em **6 ficheiros**: `login`, `register`, `forgot-password`, `confirm-email`, `reset-password`, `auth/callback` | `grep -rln "styles.button" app src --include="*.tsx"` |
| **D2** | **Campo de texto** | `ui/Input.tsx` (label, erro, foco, 16px mínimo) | `TextInput` cru + `styles.input` em **5 ficheiros** de auth | `grep -rln "styles.input" app src --include="*.tsx"` |
| **D3** | **Campo de pesquisa (glass)** | — (nenhum) | 2 blocos quase idênticos: `app/(app)/index.tsx:244` (`minHeight: 48`) e `app/(app)/companies/index.tsx:77` (`minHeight: 46`) | `grep -rn "searchBar:" app src --include="*.tsx"` |
| **D4** | **Card de empresa** | — (nenhum) | 3 variantes: `companyRow` (`index.tsx:252`), `CompanyDirectoryRow` (`CompanyDirectoryList.tsx:16`), `MyCompanyCard` (`my-companies/index.tsx:27`) — todas: nome + sub-linha + chevron | `grep -rn "function MyCompanyCard\|function CompanyDirectoryRow\|companyRow:" app src` |
| **D5** | **Estado de erro** | `ui/ErrorState.tsx` | `errorWrap` inline em `app/(app)/index.tsx:134-142` — cópia literal (ícone `warning-circle` + texto + `Button secondary sm "Tentar novamente"`) | `grep -rn "Tentar novamente" app src` |
| **D6** | **Spinner de botão** | `Button loading` + `ui/LoadingSpinner.tsx` | `<ActivityIndicator>` cru em **6 ficheiros** de auth | `grep -rln "<ActivityIndicator" app src --include="*.tsx"` |
| **D7** | **Lockup da marca** | `ui/TopBar.tsx:31` | 4 variantes de dimensão: `HeaderLogo` 40×40 (`_layout.tsx:12`), `heroLogo` 70%/max 220×64 (`index.tsx:81`), `styles.logo` 160×56 (`login`, `register`), TopBar 146×48 / 110×36 | `grep -rn "aecc-logo.webp" app src --include="*.tsx"` |
| **D8** | **Superfície de vidro** (`BlurView` + tint + border 1px + shadow) | — (nenhum `<GlassSurface>`) | repetida inline em **5 ficheiros**: `Button`, `CategoryTile`, `TopBar`, `_layout` (tabBarBackground), `index` (hero panel + value-prop wells + searchBar) | `grep -rln "<BlurView" app src --include="*.tsx"` |
| **D9** | **`buildAddressLine()`** | — | lógica idêntica duplicada: `app/(app)/companies/[id].tsx:41` e `src/components/CompanyDirectoryList.tsx:9` | `grep -rn "function buildAddressLine" app src` |

### 2.5 Variantes definidas mas nunca usadas

```bash
grep -rohE 'variant="[a-z]+"' app src --include="*.tsx" | sort | uniq -c | sort -rn
```

- `Button`: definidas 5 variantes (`primary`, `gold`, `secondary`, `destructive`, `ghost`); usadas explicitamente `secondary` ×5, `gold` ×2, `destructive` ×1, `primary` por omissão. **`ghost` nunca usada.**
- `Button`: tamanhos `sm`/`md`/`lg`; só `sm` é passado explicitamente (×6). **`lg` nunca usado.**
- `TopBar`: props `onLogin`, `onRegister`, `compact` e o ramo `authenticated={false}` (botões Entrar/Criar conta) são **código morto** — a única chamada é `<TopBar authenticated .../>` em `app/(app)/_layout.tsx:56`.
- `Badge`: 6 tons definidos (`neutral`, `info`, `success`, `warning`, `error`, `featured`).

---

## 3. Auditoria de tokens

### 3.1 Onde vivem

| Ficheiro | LOC | Conteúdo |
|---|--:|---|
| `src/theme/tokens.ts` | 100 | `spacing`, `radius`, `glassRadius`, `hitTargetMin`, `fontFamily`, `fontSize`, `lineHeight`, `fontWeight`, `shadow` — independentes do tema |
| `src/theme/colors.ts` | 142 | `ThemeColors` (interface) + `lightColors` + `darkColors` |
| `src/theme/glass.ts` | 135 | `GlassVariant` / `GlassTokens` + `lightGlass` + `darkGlass` |
| `src/theme/ThemeContext.tsx` | 105 | `ThemeProvider` / `useTheme()` — expõe tudo num único objeto; persiste override em `AsyncStorage` (`aecc_theme_mode`) |
| `public/index.html` | — | 2 CSS custom properties (`--aecc-surface-app`, `--aecc-focus-ring`), reescritas em runtime pelo `ThemeContext` |

Sem ficheiro de tokens em CSS/JSON dentro do repo. Os comentários referem um "AECC design system" externo (`tokens/colors.css`, `tokens/spacing.css`, `tokens/typography.css`, `tokens/glass.css`) que **não está versionado aqui**.

### 3.2 Tokens definidos

```bash
# contagem por grupo
sed -n '/^export const spacing = {/,/} as const;/p'    src/theme/tokens.ts | grep -cE "^\s+[0-9a-zA-Z'-]+:"
sed -n '/^export const radius = {/,/} as const;/p'     src/theme/tokens.ts | grep -cE "^\s+[a-z]+:"
sed -n "/^export const fontSize = {/,/} as const;/p"   src/theme/tokens.ts | grep -cE "^\s+'?[0-9a-zA-Z]+'?:"
sed -n '/^export interface ThemeColors {/,/^}/p'       src/theme/colors.ts | grep -cE "^\s+[a-zA-Z]+: string;"
sed -n '/^export interface GlassTokens {/,/^}/p'       src/theme/glass.ts  | grep -cE "^\s+[a-zA-Z]+: GlassVariant;"
sed -n '/^export interface GlassVariant {/,/^}/p'      src/theme/glass.ts  | grep -cE "^\s+[a-zA-Z]+:"
```

| Grupo | Nº | Valores |
|---|--:|---|
| `spacing` | **13** | `1:2 2:4 3:6 4:8 5:10 6:12 7:14 8:16 9:20 10:24 12:28 14:32 16:40` |
| `radius` | **7** | `xs:4 sm:6 md:8 lg:10 pill:20 round:28 circle:999` |
| `glassRadius` | **2** | `control:14 panel:20` |
| `hitTargetMin` | **1** | `44` |
| `fontFamily` | **2** | `display:'LibreFranklin' body:'SourceSans3'` |
| `fontSize` | **11** | `2xs:11 xs:12 sm:13 base:15 md:16 lg:18 xl:22 2xl:28 3xl:32 4xl:40 5xl:52` |
| `lineHeight` | **4** | `tight:1.15 snug:1.3 normal:1.45 relaxed:1.6` |
| `fontWeight` | **5** | `regular:400 medium:500 semibold:600 bold:700 black:800` |
| `shadow` | **3** | `card` (y1/op.10/r3/el2), `raised` (y2/op.20/r4/el4), `modal` (y4/op.28/r12/el8) |
| **cor** (`ThemeColors`) | **35** | × 2 temas = **70 valores de cor**. Grupos: surface (5), border (3), text (7), accent (6), focusRing (1), semânticos (10: success/error/warning/info/featured + `*Bg`), heroScrim (3) |
| **glass** | **5 variantes × 6 props = 30** | variantes `neutral`, `primary`, `gold`, `panel`, `heroPanel`; props `tint`, `tintActive`, `border`, `blurIntensity`, `blurTint`, `shadow`. × 2 temas = **60 valores** |

**Total de tokens definidos (chaves únicas, independentes do tema): 13+7+2+1+2+11+4+5+3+35+30 = 113.**
(Contando as duas resoluções light/dark dos tokens dependentes de tema: 113 + 35 + 30 = 178 valores.)

#### Lacunas no sistema de tokens

- **Sem escala de tamanhos de ícone.** 9 valores distintos hardcoded em `size={…}`: `11, 12, 13, 14, 16, 18, 20, 22, 24`.
- **Sem token de `letterSpacing`** (3 ocorrências hardcoded).
- **Sem tokens de opacidade** (estados disabled usam `0.4`, `0.45`, `1` soltos).
- **Sem tokens de duração/easing de animação** (nada definido, nada usado).
- **Sem token de `borderWidth`** (todos os `borderWidth: 1` são literais).
- `spacing` é uma escala não-linear deliberada (passo 2px até 16, depois 20/24/28/32/40) — o comentário em `tokens.ts:1-4` diz explicitamente que foi extraída dos StyleSheets já existentes e "nunca arredondada a uma grelha genérica de 4/8".
- `radius.round` (28) e `fontSize['3xl'/'4xl'/'5xl']` definidos mas sem consumidores.

### 3.3 Valores hardcoded fora dos tokens

Script completo (reproduzível; grava em `/tmp/aecc-audit.sh` e corre com o caminho do repo como argumento):

```bash
#!/usr/bin/env bash
# Auditoria de valores hardcoded — AECC aecc-web (Fase 0A)
# Âmbito: app/ + src/, .ts/.tsx, EXCLUINDO src/theme/* (onde os tokens são definidos)
cd "${1:-.}" || exit 1
FILES=$(find app src -type f \( -name '*.tsx' -o -name '*.ts' \) ! -path 'src/theme/*' | sort)

RE_HEX='#[0-9a-fA-F]{3,8}\b'
RE_RGB='rgba?\([^)]*\)'
RE_NAMED="'(white|black|transparent|red|blue|green|gray|grey|orange|yellow|purple|pink|brown|cyan|magenta|silver|navy|teal|lime|maroon|olive|aqua|fuchsia)'"
RE_SPACE='(padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingVertical|paddingHorizontal|margin|marginTop|marginBottom|marginLeft|marginRight|marginVertical|marginHorizontal|gap|rowGap|columnGap|width|height|minWidth|minHeight|maxWidth|maxHeight|top|bottom|left|right|borderRadius|borderWidth|borderTopWidth|borderBottomWidth|borderLeftWidth|borderRightWidth|elevation|shadowRadius|padY|padX|minH)[[:space:]]*:[[:space:]]*-?[0-9]+'
RE_TYPO="(fontSize[[:space:]]*:[[:space:]]*-?[0-9]+|fontWeight[[:space:]]*:[[:space:]]*('[0-9]+'|[0-9]+|'(bold|normal|semibold|medium|black|light)')|lineHeight[[:space:]]*:[[:space:]]*-?[0-9]+|letterSpacing[[:space:]]*:[[:space:]]*-?[0-9.]+|fontFamily[[:space:]]*:[[:space:]]*'[A-Za-z][A-Za-z0-9]*')"

count() { echo "$FILES" | xargs grep -ohE "$1" | wc -l | tr -d ' '; }
perfile() {
  for f in $FILES; do
    n=$(grep -ohE "$1" "$f" | wc -l | tr -d ' ')
    [ "$n" -gt 0 ] && printf '%4s  %s\n' "$n" "$f"
  done | sort -rn
}

echo "ficheiros analisados: $(echo "$FILES" | wc -l | tr -d ' ')"
echo "a) cores — hex: $(count "$RE_HEX") | rgb/rgba: $(count "$RE_RGB") | nomes CSS: $(count "$RE_NAMED")"
echo "b) espaçamentos/tamanhos: $(count "$RE_SPACE")"
echo "c) tipografia: $(count "$RE_TYPO")"
perfile "$RE_HEX|$RE_RGB|$RE_NAMED" | head -10
perfile "$RE_SPACE" | head -10
perfile "$RE_TYPO"  | head -10
```

**Nota metodológica:** `grep -o | wc -l` conta **ocorrências**, não linhas (`grep -c` subestima — ex.: `products/[id].tsx` tem 47 linhas mas 54 ocorrências de espaçamento). As definições de tokens (`src/theme/*`) estão excluídas, senão contavam-se como violações a si próprias.

#### a) Cores — **94 ocorrências**

| Tipo | Nº | Comando |
|---|--:|---|
| hex (`#rgb`…`#rrggbbaa`) | **76** | `… xargs grep -ohE '#[0-9a-fA-F]{3,8}\b' \| wc -l` |
| `rgb()` / `rgba()` | **11** | `… xargs grep -ohE 'rgba?\([^)]*\)' \| wc -l` |
| nomes CSS | **7** | `… xargs grep -ohE "'(white\|black\|transparent\|red\|…)'" \| wc -l` |

Valores hex distintos:

```bash
find app src -type f \( -name '*.tsx' -o -name '*.ts' \) ! -path 'src/theme/*' \
  | xargs grep -ohE '#[0-9a-fA-F]{3,8}\b' | sort | uniq -c | sort -rn
```

| Freq. | Valor | Observação |
|--:|---|---|
| 24 | `#fff` | branco em botões/fundos dos ecrãs de auth |
| 21 | `#0a7ea4` | **ciano do template Expo — não é uma cor da marca AECC.** Todo o fluxo de auth continua pintado com a cor do boilerplate |
| 8 | `#d32f2f` | vermelho Material, em vez de `colors.error` (`#b02220`) |
| 5 | `#ddd` | borda de input |
| 5 | `#666` | texto secundário |
| 3 | `#555` | texto de descrição |
| 3 | `#333` | texto de mensagem |
| 2 | `#ffffff` | `Button.tsx:59` (fg destructive), `Switch.tsx:18` (thumb) |
| 2 | `#403000` | `products/[id].tsx:296,556` — ícone de estrela |
| 1 | `#7a5c04` | `Badge.tsx:20` — fg do tom `featured` |
| 1 | `#000000` | `Icon.tsx:118` — cor por omissão do `Icon` |
| 1 | `#000` | `products/[id].tsx:613` — fundo da galeria |

Ressalvas (contagem bruta vs. real):
- 2 dos 11 `rgb/rgba` estão num **comentário** (`app/_layout.tsx:14`, a documentar os valores fixos do `DefaultTheme`/`DarkTheme`) → **9 reais**.
- 1 dos 8 `'…'` nomeados é um **literal de tipo** (`'gold'` em `ButtonVariant`, `Button.tsx:7`), já excluído do regex final; os **7** restantes são todos `'transparent'`, defensável como valor legítimo.
- **Zero hex em comentários** — as 76 ocorrências são todas código ativo.

**Top 10 ficheiros (cores):**

| Nº | Ficheiro |
|--:|---|
| 13 | `app/(auth)/register.tsx` |
| 12 | `app/reset-password.tsx` |
| 12 | `app/confirm-email.tsx` |
| 12 | `app/(auth)/forgot-password.tsx` |
| 10 | `app/(auth)/login.tsx` |
| 7 | `src/components/ImageLightbox.tsx` |
| 7 | `app/(app)/products/[id].tsx` |
| 6 | `app/auth/callback.tsx` |
| 5 | `src/components/ui/Button.tsx` |
| 2 | `src/components/ui/CategoryTile.tsx` |

> **Conclusão forte:** 66 das 94 ocorrências de cor (70%) estão nos **6 ecrãs de autenticação**, que nunca passaram pela renovação de Agosto-2026 e continuam no esquema do template Expo. Esse é o maior bloco isolado de dívida visual do repo.

#### b) Espaçamentos / tamanhos numéricos — **324 ocorrências**

```bash
RE_SPACE='(padding|paddingTop|…|borderRadius|borderWidth|…|elevation|shadowRadius|padY|padX|minH)[[:space:]]*:[[:space:]]*-?[0-9]+'
find app src -type f \( -name '*.tsx' -o -name '*.ts' \) ! -path 'src/theme/*' \
  | xargs grep -ohE "$RE_SPACE" | wc -l
```

**Top 10 ficheiros:**

| Nº | Ficheiro |
|--:|---|
| 54 | `app/(app)/products/[id].tsx` |
| 38 | `app/(app)/index.tsx` |
| 27 | `app/(app)/companies/[id].tsx` |
| 25 | `app/(app)/users/index.tsx` |
| 17 | `app/(auth)/register.tsx` |
| 16 | `src/components/ui/TopBar.tsx` |
| 15 | `app/reset-password.tsx` |
| 15 | `app/(auth)/login.tsx` |
| 15 | `app/(auth)/forgot-password.tsx` |
| 14 | `app/confirm-email.tsx` |

Para comparação, uso efetivo dos tokens de espaçamento:

```bash
find app src -type f \( -name '*.tsx' -o -name '*.ts' \) ! -path 'src/theme/*' \
  | xargs grep -ohE '(spacing\[[0-9]+\]|radius\.[a-zA-Z]+|glassRadius\.[a-zA-Z]+|hitTargetMin)' | wc -l
```

→ **77 usos de token** contra **324 literais**. Rácio ≈ **1 : 4,2** (19% tokenizado).

Padrão observado: dentro de `StyleSheet.create(...)` os valores são **sempre** literais (o `StyleSheet` é avaliado no topo do módulo, fora do `useTheme()`); o uso de `spacing[n]` aparece só nos estilos inline construídos dentro do componente. Esta é a causa estrutural do rácio — não descuido pontual.

#### c) Tipografia — **59 ocorrências**

| Propriedade | Nº |
|---|--:|
| `fontSize: <número>` | **40** |
| `fontWeight: '…'` / `<número>` | **15** |
| `letterSpacing` | **3** |
| `lineHeight: <número>` | **1** |
| `fontFamily: '…'` (literal) | **0** |

**Por ficheiro (todos os 10 com ocorrências):**

| Nº | Ficheiro |
|--:|---|
| 12 | `app/(auth)/forgot-password.tsx` |
| 10 | `app/reset-password.tsx` |
| 10 | `app/confirm-email.tsx` |
| 9 | `app/(auth)/register.tsx` |
| 7 | `app/(auth)/login.tsx` |
| 6 | `app/auth/callback.tsx` |
| 2 | `app/+not-found.tsx` |
| 1 | `app/(app)/products/[id].tsx` |
| 1 | `app/(app)/index.tsx` |
| 1 | `app/(app)/companies/[id].tsx` |

Uso efetivo dos tokens de tipografia:

```bash
find app src -type f \( -name '*.tsx' -o -name '*.ts' \) ! -path 'src/theme/*' \
  | xargs grep -ohE '(fontSize\[?[.'"'"'a-zA-Z0-9]+|fontWeight\.[a-zA-Z]+|fontFamily\.[a-zA-Z]+|lineHeight\.[a-zA-Z]+)' | wc -l
```

→ **225 usos de token** contra **59 literais** — rácio ≈ **1 : 0,26** (79% tokenizado).

**A tipografia é a dimensão mais bem tokenizada; o espaçamento é a pior.** E 54 dos 59 literais de tipografia (92%) estão, outra vez, nos 7 ecrãs fora de `(app)`. Nos ecrãs renovados sobram só 3 ocorrências (fatores de `lineHeight` ad-hoc: `fontSize.xs * 1.25`, `fontSize['2xs'] * 1.3`, e o `fontSize` responsivo do `TabLabel` em `_layout.tsx`, que escapa a este regex por ser uma variável).

Uso de tokens de cor, para completar o quadro:

```bash
find app src -type f \( -name '*.tsx' -o -name '*.ts' \) ! -path 'src/theme/*' \
  | xargs grep -ohE '(colors\.[a-zA-Z]+|glass\.[a-zA-Z]+)' | wc -l
```

→ **239 usos de token de cor** contra **94 literais** (72% tokenizado).

### 3.4 NativeWind / Tailwind vs. StyleSheet

```bash
grep -iE "nativewind|tailwind" package.json           # → sem ocorrências
ls tailwind.config.* nativewind-env.d.ts 2>/dev/null  # → não existem
grep -rn "className=" app src --include="*.tsx" | wc -l   # → 0
```

**Nem NativeWind nem Tailwind estão instalados ou configurados. Zero `className=` no código.**
O styling é 100% React Native: `StyleSheet.create` + objetos de estilo inline.

```bash
grep -rl "StyleSheet.create" app src --include="*.tsx" | wc -l   # → 16 de 31 .tsx
grep -roh "style={{" app src --include="*.tsx" | wc -l           # → 120
grep -roh "styles\.[a-zA-Z]" app src --include="*.tsx" | wc -l   # → 216
```

| Abordagem | Ficheiros | Referências |
|---|--:|---|
| `StyleSheet.create` (estático) | 16 | 216 referências `styles.*` |
| Só estilos inline (`style={{…}}`) | 15 | 120 ocorrências `style={{` |

Proporção aproximada: **~⅓ inline, ~⅔ StyleSheet** por volume de referências; metade dos ficheiros em cada campo.

A divisão não é arbitrária — segue o acesso ao tema:

- **Os 13 ecrãs com `StyleSheet.create`** usam-no para layout (flex, gaps, dimensões) e passam a cor/tipografia por inline, porque `StyleSheet.create` corre fora do React e não alcança `useTheme()`.
- **As 11 primitivas de `ui/` sem `StyleSheet.create`** (`Badge`, `Button`, `Card`, `Chip`, `EmptyState`, `ErrorState`, `IconButton`, `Input`, `LoadingSpinner`, `Modal`, `Switch`) são inteiramente inline — tudo nelas depende do tema.
- Exceções: `CategoryTile` e `TopBar` misturam as duas (StyleSheet para geometria, inline para tema), e `CompanyDirectoryList` também.

**Implicação para o redesign:** há 216 referências `styles.*` que, por construção, nunca poderão ler tokens enquanto viverem em `StyleSheet.create` no topo do módulo. Reduzir os 324 literais de espaçamento exige uma decisão de arquitetura (factory `createStyles(theme)`, hook `useStyles`, ou migração para NativeWind), não uma passagem de substituições.

---

## 4. Dependências de UI

```bash
node -e "const p=require('./package.json');const a={...p.dependencies,...p.devDependencies};Object.keys(a).sort().forEach(k=>console.log(k.padEnd(42),a[k]))"
# versões realmente instaladas
node -e "console.log(require('./node_modules/<pkg>/package.json').version)"
```

### 4.1 Instaladas

| Pacote | Declarada | Instalada | Papel na UI |
|---|---|---|---|
| `expo` | `~52.0.46` | **52.0.49** | SDK base |
| `expo-router` | `~4.0.20` | **4.0.22** | Routing baseado em ficheiros; `typedRoutes: true` |
| `react` | `18.3.1` | 18.3.1 | — |
| `react-native` | `0.76.9` | 0.76.9 | `StyleSheet`, `Animated` (não usado), primitivas |
| `react-native-web` | `~0.19.13` | 0.19.13 | Alvo web (`output: 'single'`, bundler metro) |
| `expo-blur` | `~14.0.3` | 14.0.3 | **`<BlurView>` — base de todo o sistema "seamless glass"** (5 ficheiros) |
| `react-native-svg` | `15.8.0` | 15.8.0 | Motor do `<Icon>` (`<Svg>` + `<Path>`) |
| `expo-font` | `~13.0.4` | 13.0.4 | Carrega as 2 fontes variáveis |
| `expo-splash-screen` | `~0.29.24` | 0.29.24 | Splash até as fontes carregarem |
| `expo-status-bar` | `~2.0.1` | 2.0.1 | Status bar |
| `expo-image-picker` | `~16.0.6` | 16.0.6 | Upload de logo e imagens de produto |
| `expo-asset` | `~11.0.5` | 11.0.5 | Assets |
| `react-native-safe-area-context` | `4.12.0` | 4.12.0 | `SafeAreaView` / `useSafeAreaInsets` (`Modal`) |
| `react-native-screens` | `~4.4.0` | 4.4.0 | Navegação nativa |
| `@react-navigation/native` | *(não declarada)* | **7.3.4** | ⚠️ importado diretamente em `app/_layout.tsx:5` (`DefaultTheme`, `DarkTheme`, `ThemeProvider`) mas é **dependência transitiva** do `expo-router` — não está no `package.json` |
| `@expo/metro-runtime` | `~4.0.1` | 4.0.1 | Runtime web |
| `@react-native-async-storage/async-storage` | `2.1.2` | 2.1.2 | Persiste o override de tema (`aecc_theme_mode`) |
| `expo-secure-store` | `~14.0.1` | 14.0.1 | Token (plugin Expo) |

### 4.2 Ausentes — relevante para o redesign

| Pacote | Estado | Impacto |
|---|---|---|
| `react-native-reanimated` | **não instalado** | Sem motor de animação. `grep -rn "Animated" app src` → 0. **Não há uma única animação ou transição no código** além das nativas do React Navigation. |
| `react-native-gesture-handler` | **não instalado** | Sem gestos (swipe, pan, bottom sheets). O lightbox navega por botões `caret-left`/`caret-right`, não por swipe. |
| `nativewind` / `tailwindcss` | **não instalado** | Confirmado em 3 verificações independentes (ver §3.4). |
| Biblioteca de ícones (`lucide`, `phosphor-react-native`, `@expo/vector-icons`) | **não instalado** | `Icon.tsx` embute **35 paths SVG do Phosphor copiados à mão** (filled, viewBox 256). Sem `strokeWidth`; adicionar um ícone exige copiar path data. |
| `expo-linear-gradient` | **não instalado** | Os 3 tokens `heroScrim*` existem em `colors.ts` mas **não têm consumidor** — não há forma de pintar o gradiente do hero. |
| `date-fns` / `dayjs` | **não instalado** | Sem formatação de datas. |
| Biblioteca de testes (`jest`, `@testing-library/*`) | **não instalado** | **Zero testes no repo.** Nenhuma rede de segurança para o redesign. |

### 4.3 Toolchain

`typescript ~5.3.3` · `eslint ^8.57.1` + `eslint-config-expo ~8.0.0` · `prettier ^3.4.2` + `eslint-plugin-prettier ^5.5.6` · `@babel/core ^7.25.0` · `@types/react ~18.3.12`

Scripts: `start`, `web`, `ios`, `android`, `build:web` (`expo export --platform web`), `lint`, `format`.
Sem script `test`. Sem script `typecheck` (correr `npx tsc --noEmit` à mão).

---

## 5. Resumo

| Métrica | Valor |
|---|--:|
| **Nº ecrãs** | **16** (+3 layouts) |
| **Nº componentes** | **17** (14 primitivas `ui/` + 3 compostos) |
| **Nº duplicados** | **9** |
| **Nº tokens definidos** | **113** chaves únicas (178 valores contando light+dark) |
| **Nº cores hardcoded** | **94** (76 hex + 11 rgb/rgba + 7 nomes CSS) |
| **Nº espaçamentos hardcoded** | **324** |
| **Nº tipografia hardcoded** | **59** (40 fontSize + 15 fontWeight + 3 letterSpacing + 1 lineHeight) |

**Total de valores hardcoded: 477** em 54 ficheiros.

### 5.1 Rácio token vs. literal, por dimensão

| Dimensão | Tokens usados | Literais | % tokenizado |
|---|--:|--:|--:|
| Tipografia | 225 | 59 | **79%** |
| Cor | 239 | 94 | **72%** |
| Espaçamento / raio | 77 | 324 | **19%** |

### 5.2 Onde está concentrada a dívida

1. **Os 7 ecrãs fora de `(app)`** (`login`, `register`, `forgot-password`, `confirm-email`, `reset-password`, `auth/callback`, `+not-found`) nunca passaram pela renovação de Agosto-2026. Não importam `useTheme()`, não usam nenhuma primitiva de `ui/`, e continuam no esquema de cor do template Expo (`#0a7ea4` ×21). Concentram **66 das 94 cores hardcoded (70%)** e **54 das 59 ocorrências de tipografia (92%)**. São também a origem de 4 dos 9 duplicados (D1, D2, D6, D7).
2. **`app/(app)/products/[id].tsx`** (691 LOC) e **`app/(app)/companies/[id].tsx`** (736 LOC) são 36% do código de `app/` e lideram o espaçamento hardcoded (54 + 27 ocorrências).
3. **O espaçamento é estruturalmente intokenizável** no padrão atual: os 216 usos de `styles.*` vivem em `StyleSheet.create` no topo do módulo, fora do alcance de `useTheme()`. Resolver os 324 literais é uma decisão de arquitetura, não uma substituição em massa.
4. **Não existe camada de abstração de vidro.** O padrão `BlurView` + tint + border + shadow está copiado inline em 5 ficheiros (D8) — é a assinatura visual do produto e não tem componente próprio.
5. **Sem animação (`reanimated` ausente, 0 usos de `Animated`), sem gestos, sem testes.** O redesign parte de uma base estática e sem rede de segurança.
6. **Código morto a limpar antes de redesenhar:** ramo não-autenticado do `TopBar` (+ props `onLogin`/`onRegister`/`compact`), `Button variant="ghost"`, `Button size="lg"`, `radius.round`, `fontSize['3xl'/'4xl'/'5xl']`, e os 3 tokens `heroScrim*` sem consumidor (falta `expo-linear-gradient`).
7. **Lacunas de UX a decidir na Fase 0B:** `RoleGuard` sem ecrã de "sem permissão" (redirect silencioso em 2 rotas), `/` sem estado vazio, loading de sessão a renderizar `null`, erros de ação via `Alert.alert` nativo em 6 pontos, e 0 skeletons.

---

## 6. Validação

```bash
cd /Users/salvadorlopes/RiderProjects/AECC/aecc-web
git status --short
git status --short --untracked-files=all
git diff --name-only; git diff --cached --name-only
git branch --show-current; git rev-parse --short HEAD
```

```
# git status --short
?? .claude/
?? docs/

# git status --short --untracked-files=all
?? .claude/worktrees/aecc-web-gallery-fix/
?? .claude/worktrees/aecc-web-users-mgmt/
?? .claude/worktrees/form-error-handling/
?? .claude/worktrees/theme-token-fixes/
?? docs/redesign/00-inventario.md

# git diff --name-only + git diff --cached --name-only
(vazio)

# git branch --show-current / git rev-parse --short HEAD
main
b285f06
```

- **Único ficheiro novo criado por esta tarefa:** `docs/redesign/00-inventario.md`. Com `--untracked-files=all` é o único ficheiro listado fora de `.claude/`.
- **`.claude/`** (4 worktrees antigos) já estava untracked antes de esta tarefa começar — verificado com `git status --short` na primeira leitura do repo, antes de qualquer escrita. Não foi criado nem alterado aqui.
- **Nenhum ficheiro existente modificado:** `git diff --name-only` e `git diff --cached --name-only` devolvem vazio; `git status` não lista nenhuma entrada ` M `, ` D ` ou ` R `.
- **Nenhum branch criado:** `main`, em `b285f06`, inalterado.
