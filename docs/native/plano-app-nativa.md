# Plano da app nativa — Fase A (análise, só leitura)

Data: 2026-11-15 · Branch `native/fase-a` (base `origin/main` @ `4428108`, PR #30 integrado).
Âmbito: iOS e Android (sem lojas). Validação: iPhone 17 Pro (iOS 26.3), runtime iOS < 26, Pixel_8_API_36.
Nada neste documento foi executado nem instalado; o que não foi verificado vem marcado **(não verificado)**.

---

## 0. Estado pós-redesign (passo 0)

- PR #30: `MERGED` (2026-11-15T17:14:48Z, merge `4428108`). PR #19: já estava `MERGED`, nada a fechar.
- Branches no origin depois do `fetch --prune`: só `main`. Nada a apagar (antes e depois: `origin/main`).
- Worktree `fase3-design-system` estava limpo: removido sem `--force`; `git worktree prune` feito. Branch local `redesign/fase3-b14-limpeza` apagado com `-d`.
- Checkout principal: `main`, `pull --ff-only` (já atualizado), `npm ci` OK.

---

## 1. Mapa do login atual

### 1.1 aecc-web

| Peça | Onde | Como funciona |
|---|---|---|
| Estado de sessão | `src/context/AuthContext.tsx:55-193` | `user`, `token`, `isLoading`; liga o token ao cliente HTTP via `setTokenGetter` (`:61-63`) |
| Armazenamento | `AuthContext.tsx:10-22` | chaves `aecc_access_token` / `aecc_refresh_token`. **Web: AsyncStorage (localStorage). Nativo: `expo-secure-store`** (já é dependência, `package.json:27`, e plugin em `app.config.ts:32`) |
| Ecrã de login | `app/(auth)/login.tsx:14-42` | valida, chama `login()`; comentário `:33-34` e `:40-41` assumem que o browser navega para fora |
| Passo 1 | `AuthContext.tsx:135-141` + `src/api/auth.api.ts:38` | `POST /auth/login` (cria cookie Identity) e depois `redirectToAuthorize()` |
| Passo 2 | `AuthContext.tsx:123-132` | gera verifier/challenge/state (`src/pkce.ts`), guarda em **`sessionStorage`** (`:128-129`) e faz **`window.location.href = /connect/authorize?...`** (`:131`). `client_id=aecc-web`, scope `openid profile email roles aecc_api offline_access`, S256 |
| Passo 3 | `app/auth/callback.tsx:16-39` → `AuthContext.tsx:144-172` | lê `code`/`state` de `useLocalSearchParams`, valida state contra `sessionStorage`, `POST /connect/token` (`auth.api.ts:41-50`), guarda tokens, `GET /auth/me`, `router.replace('/companies')` |
| Redirect URI | `AuthContext.tsx:24-27` | `window.location.origin + /auth/callback` |
| Cliente HTTP | `src/api/client.ts:37-94` | `fetch` com `Authorization: Bearer`, `credentials: 'include'` (`:53`); em 401 chama o refresher uma vez (`:83-91`). **Sem timeout** (`:50`) |
| Renovação | `AuthContext.tsx:66-85` e `:99-114` | `grant_type=refresh_token` (`auth.api.ts:52-59`); guarda o novo refresh se vier; se falha limpa tudo |
| Arranque com sessão | `AuthContext.tsx:88-119` | lê token → `GET /auth/me`; se falha tenta refresh. Sem timeout: com a API inalcançável o `isLoading` fica `true` (hipótese **H3** de `docs/redesign/upgrade-sdk55.md:186`) |
| Logout | `AuthContext.tsx:174-184` | `POST /auth/logout` (apaga cookie), apaga as duas chaves, `token/user = null`. O guarda `app/(app)/_layout.tsx:14-18` redireciona para o login |
| register | `app/(auth)/register.tsx:28` | `POST /auth/register {email}`; não toca em tokens |
| forgot | `app/(auth)/forgot-password.tsx:28` | `POST /auth/forgot-password`; sem tokens |
| confirm-email | `app/confirm-email.tsx:19-62` | lê `userId`/`token` da query, `POST /auth/confirm-email` (a API faz `SignInAsync`, cookie) e depois **`redirectToAuthorize()`** (`:62`) → mesmo fluxo web |
| reset-password | `app/reset-password.tsx:17,67` | `POST /auth/reset-password`, depois botão para o login; **não** autentica |

Usos de APIs só-web fora do login: `src/utils/confirm.ts:17` (`window.confirm`, protegido por plataforma), `ImageLightbox.tsx:57-64` e `ThemeContext.tsx:79-80` (ambos com `Platform.OS === 'web'`). **O único bloqueio nativo é o fluxo de login** (`sessionStorage`, `window.location`, e `crypto.subtle` em `src/pkce.ts:14-18`, que o Hermes não tem).

### 1.2 aecc-api (`../aecc-api`, só leitura; OpenIddict 7.5.0)

- Servidor OpenIddict: `AECC.Api/Program.cs:90-153`. Endpoints `/api/connect/authorize` e `/api/connect/token` (passthrough, `:96-97, :143-145`); só **authorization code + refresh token** (`:110-111`); certificados persistentes em `/keys` em produção (`:126-136`).
- **Tempos de vida: não há `Set*Lifetime` no `Program.cs`** → valem os defaults do OpenIddict **(não verificado na 7.5.0; esperado: access ~1 h, code ~5 min, refresh ~14 dias com rotação)**. Confirmar na Fase B antes de decidir o UX de renovação.
- Cliente: `AECC.Infrastructure/Seed/OpenIddictSeeder.cs:26-69`. **Um único cliente público `aecc-web`**, `ConsentType.Implicit`, PKCE obrigatório (`:59`), redirect URIs só `https://aecc.salv4.com/auth/callback` e `http://localhost:8081/auth/callback` (`:33-37`), permissões: authorization + token endpoints, grant `authorization_code` e `refresh_token`, response type `code`, scopes openid/profile/email/offline_access/roles/aecc_api. O seeder é idempotente (`UpdateAsync`, `:64-68`) e corre no arranque (`Program.cs:246-247`). O comentário `:9` ("PLACEHOLDERS… expo-auth-session") está desatualizado. **Não há cliente nativo nem `aecc://`.**
- `/auth/login`: `AuthController.cs:21-50`. Valida, exige email confirmado e conta ativa, lockout (5 falhas, 15 min, `Program.cs:69-76`), `SignInAsync(isPersistent:false)` → **cookie de sessão Identity**, corpo vazio `200`.
- `/connect/authorize`: `AuthorizationController.cs:18-98`. **Não tem UI**: lê o cookie Identity (`:26`); sem cookie devolve erro OIDC `login_required` (`:28-39`) e não redireciona para nenhum login. Com cookie emite o code (`SignIn`, `:97`).
- `/connect/token`: `:100-139`. Aceita só `authorization_code` e `refresh_token` (`:106-107`); verifica utilizador existente e ativo.
- **Páginas servidas pela API: nenhuma.** Só controllers JSON (`AECC.Api/Controllers/*`), sem Razor, sem `wwwroot`. Portanto não existe página de login do servidor.
- Links de email: `AuthController.cs:97` e `:168` **fixam `https://aecc.salv4.com/confirm-email?...` e `/reset-password?...`**. Não existe link `aecc://`.
- CORS: `Program.cs:208-221`, origens de `Cors:AllowedOrigins`, `AllowCredentials`.
- Testes: `AECC.Tests/AuthTests.cs` (3 testes de login/me), `ApiFixture.cs`; nenhum cobre `/connect/*`. CI: `.github/workflows/deploy.yml` corre `dotnet test` e faz push da imagem para o GHCR e SSH ao servidor em cada push a `main`.

---

## 2. Opções de fluxo nativo

Facto técnico que decide a (c) — **não verificado empiricamente**: o `fetch` do React Native (NSURLSession no iOS, OkHttp no Android) partilha cookies com a sessão nativa e `credentials: 'include'` funciona (já usado em `client.ts:53`), mas **não suporta `redirect: 'manual'`** e segue sempre os redirects. O `/connect/authorize` responde `302 → aecc://auth/callback?code=…`; o seguimento automático falha num esquema que o stack HTTP não sabe abrir e o erro devolvido (`TypeError: Network request failed`) **não expõe o URL de destino**. Sem acesso ao `Location`, não se obtém o `code`.

| Critério | (a) PKCE no browser do sistema (RFC 8252) | (b) T1 mantido, API emite tokens a partir das credenciais | (c) cookie + `fetch /authorize` + intercetar `aecc://` | (d) ROPC puro |
|---|---|---|---|---|
| Segurança | Melhor: a app nunca vê a password | Boa com TLS: a password vai da app para a API uma vez (a app já a vê no T1 de qualquer forma). Mitigações: cliente dedicado, lockout já existente, rate limit | Igual à atual, mas inviável (ver acima) | Igual à (b) na prática, mas fora do OAuth 2.1 |
| UX | Perde o T1 no nativo; a sheet do sistema mostra o aviso "AECC quer usar aecc.salv4.com para iniciar sessão" (iOS); página de login do servidor com marca à parte | **Mantém o T1 e o teclado/autofill nativos** | T1 mantido | T1 mantido |
| Esforço aecc-api | **Alto**: não existe página de login. Há que criar login (e registo/forgot/reset se quisermos o fluxo completo) renderizado no servidor, tratamento de `login_required`, estilos, testes | **Médio-baixo**: novo cliente, `AllowCustomFlow` (ou `AllowPasswordFlow`) + ramo em `Exchange` (`:106-107`) + testes de integração | Médio (cliente + URIs) | Baixo (`AllowPasswordFlow` + ramo em `Exchange`) |
| Esforço aecc-web | Médio: `expo-web-browser` + `expo-auth-session` + `expo-crypto`, callback por deep link | **Baixo-médio**: ramo `Platform.OS !== 'web'` em `AuthContext`; `expo-crypto` não é necessário (sem PKCE) | Alto e sem garantia | Baixo |
| Web sem alterações | Sim | **Sim** (o ramo web e o cliente `aecc-web` ficam intocados) | Sim | Sim |
| Renovação / logout | Refresh via `/connect/token` como hoje. Logout: apagar tokens + sessão do browser (cookie fica no Safari/Chrome; precisa de `prompt=login` ou endpoint de logout) | Refresh via `/connect/token` como hoje (mesmo endpoint). Logout: apagar SecureStore + (opcional) revogar o refresh token | n/a | Igual à (b) |
| Maestro | **Frágil**: a `ASWebAuthenticationSession`/Custom Tab é UI do sistema (diálogo de consentimento, Safari fora do processo da app); o Maestro pode tocar em diálogos do sistema no iOS, mas é flaky e no Android o Custom Tab é outra atividade **(não verificado)** | **Simples**: tudo em RN, com os `testID` `login.*` já existentes | n/a | Simples |
| Links de email no telemóvel | Abrem no browser (hardcoded `https://aecc.salv4.com/...`); o fluxo web completa-se lá. Para abrir na app é preciso Universal/App Links (fora de âmbito) | Igual | Igual | Igual |
| Estado | RFC 8252, recomendado para apps de terceiros | O token endpoint fica com um grant não standard, restrito ao cliente nativo | — | Removido no OAuth 2.1 |

**Nota honesta sobre (b) vs (d):** o OpenIddict só emite tokens através dos seus endpoints, por isso a (b) tem de ser implementada como grant no `/connect/token`. Funcionalmente é um ROPC com nome próprio, **restrito a um cliente dedicado**. A diferença para a (d) é de governação (um grant custom, aprovado só para `aecc-native`, sem abrir o password grant a outros clientes). Não afirmo mais segurança do que isso.

### Recomendação: **(b)**, implementada como grant dedicado no cliente `aecc-native`

Razões: mantém o ecrã T1 do redesign no nativo, é a única opção testável com Maestro sem fragilidade, não toca no fluxo web, e o esforço no aecc-api é pequeno comparado com construir páginas de login no servidor. O risco aceite: a password passa pela app (já acontece hoje), por isso o grant fica limitado a um cliente com lockout e TLS. **Decisão que precisa de aprovação do Salvador** (ver §7): se preferires cumprir estritamente RFC 8252/OAuth 2.1, a (a) é a alternativa, ao custo de criar as páginas no servidor e de perder o T1 e a testabilidade no nativo.

Esboço (aecc-api):
1. Novo cliente público `aecc-native` no `OpenIddictSeeder` (sem redirect URIs necessários; opcionalmente registar `aecc://auth/callback` para uma migração futura à (a)), permissões: token endpoint, `refresh_token`, o grant custom, scopes iguais aos do web.
2. `options.AllowCustomFlow("urn:aecc:grant-type:credentials")` (ou `AllowPasswordFlow()` se se preferir o nome standard).
3. Em `Exchange`: ramo que valida `email`/`password` com as mesmas regras do `/auth/login` (email confirmado, ativo, lockout, `CheckPasswordSignInAsync`), constrói o principal como no `Authorize` (`AuthorizationController.cs:66-95`) e devolve `SignIn`. Extrair a construção do principal para um método partilhado para não duplicar.
4. Testes de integração em `AECC.Tests`: sucesso, password errada, lockout, não confirmado, conta inativa, cliente errado a usar o grant (deve falhar), refresh funciona, e regressão do fluxo web (authorize + code).

Esboço (aecc-web, só nativo): `AuthContext.login` ramifica por `Platform.OS`; no nativo chama `authApi.nativeLogin(credentials)` e guarda os tokens como em `completeOAuthLogin`; sem `sessionStorage`, sem `window`. `redirectToAuthorize`/`completeOAuthLogin` ficam só no web (ficheiro `.web.ts` ou guarda por plataforma). Para `confirm-email` no nativo: não há `redirectToAuthorize`; ir para o login com aviso de sucesso (ou a API passa a devolver o email na resposta para auto-login, a decidir na Fase B). `reset-password` já acaba no login.

---

## 3. Tokens no nativo

- **Armazenamento:** `expo-secure-store` já está instalado e configurado (`~55.0.18`, versão do SDK 55 confirmada com `npm view`: `55.0.18`) → **não é dependência nova**. `AuthContext.tsx:15-22` já o usa fora do web. Keychain (iOS) / Keystore (Android).
- **Pontos a validar:**
  - **Tamanho do valor:** o access token do OpenIddict é cifrado por defeito (há certificado de encriptação, `Program.cs:128-135`) e pode ultrapassar 2 KB com as claims e scopes atuais. O SecureStore já teve limites de ~2048 bytes em alguns Android **(não verificado nesta versão)**. Medir o token real na Fase B; se for problema, guardar só o refresh token e pedir o access token no arranque, ou desativar a encriptação do access token (decisão de segurança a levar à aprovação).
  - **iOS mantém o Keychain após desinstalar.** Definir `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` e, no primeiro arranque, limpar as chaves se não houver marca de "já arrancou" (evita sessão fantasma em reinstalações).
- **Renovação:** igual à web (`client.ts:83-91`). Dois pontos a corrigir na Fase B por afetarem sobretudo o nativo: (i) `isRefreshing` global faz com que um segundo 401 concorrente falhe sem repetir; (ii) **timeout nos `fetch`** (H3: arranque pendurado com a API inalcançável).
- **Logout:** apagar as duas chaves; chamar `POST /auth/logout` não limpa nada no nativo (não há cookie relevante), manter por compatibilidade, e idealmente revogar o refresh token (endpoint de revogação não existe hoje; fora do primeiro passo).
- **Web:** mantém AsyncStorage e o comportamento atual, sem alterações. (Observação, fora de âmbito: na web o refresh token fica em localStorage.)

---

## 4. Deep links

- `scheme: 'aecc'` já existe (`app.config.ts:9`). Com a recomendação (b) **o login nativo não precisa de redirect URI**; o scheme serve ao Maestro (`launchApp` com `openLink`) e a uma eventual migração à (a).
- **Prebuild (`npx expo prebuild`, não executado; não há `ios/` nem `android/` na árvore):**
  - iOS: `CFBundleURLTypes` com `CFBundleURLSchemes = [aecc]` (e o `bundleIdentifier` como esquema) no `Info.plist`.
  - Android: `<intent-filter>` com `VIEW`/`DEFAULT`/`BROWSABLE` e `<data android:scheme="aecc"/>` na `MainActivity` do `AndroidManifest.xml`.
- **Se um dia se fizer a (a):** redirect URI `aecc://auth/callback` (um segmento, sem `//` extra), registado no cliente `aecc-native`; `expo-auth-session` usa `makeRedirectUri({ scheme: 'aecc', path: 'auth/callback' })`. Em Expo Router a rota `app/auth/callback.tsx` já existe e atenderia o deep link.
- **Universal Links / App Links:** fora de âmbito. Só referir que seriam a forma de os links de `confirm-email` e `reset-password` (hoje `https://aecc.salv4.com/...` fixos em `AuthController.cs:97,168`) abrirem a app: exigiriam `apple-app-site-association` e `assetlinks.json` em `aecc.salv4.com` e `associatedDomains`/`intentFilters` com `autoVerify` no `app.config.ts`.

---

## 5. Plano de validação nativa (bloco 2)

### 5.1 Ambientes

| Alvo | Estado atual | Notas |
|---|---|---|
| iPhone 17 Pro, iOS 26.3 | existe e está arrancado (`DDF06401…`); runtime 26.3.1 instalado (disk image 7,8 GB) | |
| iOS < 26 | **não instalado** (`xcrun simctl runtime list` só mostra o 26.3.1) | ver abaixo |
| Android Pixel_8_API_36 | AVD existe (`emulator -list-avds`) | para a API local, o emulador vê o host em `10.0.2.2`, não `localhost`; HTTP em claro exige `usesCleartextTraffic` em dev. Preferir apontar `EXPO_PUBLIC_API_URL` para `https://aecc.salv4.com/api` (ou um túnel HTTPS) |

**Instalar um runtime iOS < 26 com o Xcode 26.3** (não executado):

```bash
xcodebuild -downloadPlatform iOS -buildVersion 18.6      # runtime iOS 18.6
xcrun simctl runtime list                                # confirmar
xcrun simctl create "iPhone 16 (iOS 18.6)" \
  com.apple.CoreSimulator.SimDeviceType.iPhone-16 \
  com.apple.CoreSimulator.SimRuntime.iOS-18-6
```

Espaço: o runtime 26.3.1 atual ocupa **7,8 GB**; um runtime 18.x deve ser da mesma ordem (**estimativa, não verificado**), com um pico de espaço durante o download/instalação possivelmente a ~2× esse valor. **Há ~14 GB livres hoje (`df` dá 14 GiB)**: apertado. Antes de instalar: libertar espaço (`xcrun simctl delete unavailable`, DerivedData, builds antigas) e confirmar a versão exata disponível com `xcodebuild -downloadPlatform iOS -showBuildVersions` **(flag a confirmar; não verificado)**. Alternativa sem instalar: `eas simulator` na cloud (skill `expo:eas-simulator`), útil se o espaço não chegar.

### 5.2 Matriz ecrã × plataforma

Legenda: ☐ por validar · ✱ item obrigatório. Cada célula = abrir o ecrã, claro e escuro, e comparar com a baseline em `docs/redesign/baseline/`.

| Bloco / ecrã | iOS 26.3 | iOS < 26 | Android 36 | O que olhar |
|---|---|---|---|---|
| **B4** `GlassSurface`/`GlassGroup` (`expo-glass-effect`) | ☐ | ☐ | ☐ | iOS 26: vidro real. iOS < 26 e Android: fallback legível (contraste do texto sobre o fundo), sem `BlurView` |
| **B6** paleta Maré (Início, listas, tabs) | ☐ | ☐ | ☐ | cores corretas, claro/escuro |
| **B9** T2 estados: sessão a carregar, callback, not-found, sem permissão | ☐ | ☐ | ☐ | `StateScreen`; ✱ **arranque com sessão guardada (H3)**: token válido, token expirado com refresh válido, refresh inválido, API inalcançável (deve falhar por timeout, não ficar pendurado) |
| **B11** T4 detalhe: empresa, produto | ☐ | ☐ | ☐ | ✱ **lightbox**: abrir/fechar, gesto/botão voltar do Android, safe areas, tokens de cor; `InlineAlert` |
| **B12** T7 formulários: editar empresa, editar produto, criar utilizador | ☐ | ☐ | ☐ | ✱ **teclado** (`FormLayout.tsx:98-135`, `KeyboardAvoidingView` com offset do header): último campo visível acima do teclado, scroll com teclado aberto, `returnKeyType`, tab entre campos, teclado fechado ao tocar fora, em iPhone pequeno/Pro e Pixel. ✱ **ImagePicker** (ver abaixo) |
| **B14** limpeza (sem `expo-blur`, sem `Modal`, Geist) | ☐ | ☐ | ☐ | nenhum ecrã a usar aliases antigos; fontes Geist carregam (H1); arranque sem crash |
| **Perfil** (T6) | ☐ | ☐ | ☐ | ✱ **toggle de tema** system/light/dark: `Appearance.setColorScheme` (`ThemeContext.tsx:61`) deve propagar à tab bar nativa, ao vidro e à status bar; com override guardado, reabrir a app mantém-no; voltar a "system" segue o SO |
| **Tabs por papel** | ☐ | ☐ | ☐ | ✱ `Admin` vs `Associado` vs sem papel (`src/navigation/tabs.ts:71-89`): visibilidade certa já no primeiro render (mudar a visibilidade remonta o navegador); máx. 5 tabs no Android; ícones `sf`/`md` |
| **Login (T1) e fluxos de auth** | ☐ | ☐ | ☐ | só depois da Fase B: login, erro de credenciais, lockout, register, forgot, ✱ link de confirm-email/reset aberto no telemóvel (browser) |
| **Dark** (todos acima) | ☐ | ☐ | ☐ | contraste, splash escuro (`app.config.ts:46-50`), status bar |

### 5.3 Itens obrigatórios, com o que se sabe do código

1. **Teclado nos T7:** `FormLayout.tsx` usa `KeyboardAvoidingView`; `AuthScaffold.tsx:129` usa `automaticallyAdjustKeyboardInsets`. Validar os dois padrões em iOS e Android (no Android 36 com edge-to-edge, `behavior` costuma ter de ser diferente do iOS).
2. **ImagePicker, permissões e strings:** `edit.tsx` (empresa e produto) chama `ImagePicker.launchImageLibraryAsync`, mas **`app.config.ts` não tem o plugin `expo-image-picker`**: sem ele o iOS não tem `NSPhotoLibraryUsageDescription` (a app pode fechar ao abrir o picker). **Corrigir na Fase B:** adicionar `['expo-image-picker', { photosPermission: 'A AECC precisa de aceder às tuas fotos para escolheres o logótipo e as imagens dos produtos.', cameraPermission: false, microphonePermission: false }]` (texto em PT; a versão do plugin acompanha `expo-image-picker ~55.0.24`, já instalado → sem dependência nova). Android: o seletor de fotos do sistema não pede permissão em Android 13+; confirmar em API 36.
3. **Ícones da status bar no Android em modo claro:** o projeto tem `expo-status-bar ~55.0.6`, mas **não há nenhum `StatusBar` em `app/` ou `src/`** (grep). Em edge-to-edge (Android 36) o estilo por defeito pode dar ícones claros sobre fundo claro. Validar em claro e escuro e, se falhar, definir `<StatusBar style="auto" />` no `app/_layout.tsx` (já ligado ao tema) ou o `androidStatusBar` no config.
4. **`Appearance.setColorScheme` com o toggle:** ver Perfil acima; incluir a tab bar nativa e o `GlassView` (`fase3-plano.md` §2.2-3 avisa que a barra não segue um esquema definido só em JS).
5. **Tabs por papel:** ver linha dedicada.
6. **Lightbox:** ver B11.
7. **Arranque com sessão guardada (H3):** ver B9; é também o teste de regressão do `AuthContext` na Fase B.

### 5.4 Fluxos Maestro autenticados a criar

Existe só `e2e/maestro/native/smoke-public.yaml` (ecrãs públicos). Novos, em `e2e/maestro/native/`, todos com `appId: com.aecc.app`, os `testID` existentes e **credenciais por variável de ambiente do Maestro (`-e USER=… -e PASS=…`), nunca no YAML**; usar o seed E2E da API (`SeedE2eCommand`) numa API de teste, não produção:

| Fluxo | Cobre |
|---|---|
| `login-associado.yaml` | login válido → `/companies`; tabs do Associado; screenshot |
| `login-admin.yaml` | login Admin → tab extra (utilizadores); screenshot |
| `login-erro.yaml` | password errada → `login.form-error`; lockout opcional |
| `sessao-guardada.yaml` | login → `launchApp` (sem `clearState`) → entra direto na lista (H3) |
| `logout.yaml` | Perfil → sair → `login.screen`; reabrir → continua no login |
| `tema.yaml` | Perfil → dark → screenshot de tabs/lista → light → system |
| `empresa-editar.yaml` | T7: abrir formulário, teclado aberto, guardar |
| `lightbox.yaml` | detalhe de produto → abrir lightbox → fechar |
| `deeplink.yaml` | `openLink: aecc://confirm-email?...` e `aecc://reset-password?...` com tokens de teste: página correta (rotas já existem) |

O picker de fotos do sistema não se automatiza bem no Maestro: validar à mão.

---

## 6. Plano de execução

### Fase B — implementação (aecc-api primeiro, depois aecc-web)

Cada passo termina verde: no aecc-api `dotnet test AECC.slnx`; no aecc-web `npm run lint`, `tsc --noEmit` e **Playwright 9/9** (baseline pedida; a lista atual de specs está em `e2e/web/specs`, confirmar o número real no B-W0).

**aecc-api** (repo separado, branch própria, PR com o teu OK; esta sessão não escreve lá):
- **B-A1** Testes de caracterização de `/connect/authorize` + `/connect/token` (code + refresh) — hoje não há. Rede de segurança para não regredir a web.
- **B-A2** Seeder: cliente `aecc-native` + permissões. Teste: cliente existe, `aecc-web` inalterado.
- **B-A3** Grant dedicado em `Exchange` + extração do principal partilhado + testes (casos em §2). Rate limiting no endpoint, se ainda não existir.
- **B-A4** Confirmar lifetimes reais (§1.2) e, se necessário, fixá-los explicitamente; medir tamanho do access token.
- **B-A5** Deploy: merge a `main` dispara `dotnet test` → build → GHCR → SSH (`deploy.yml`). Verificar `/api/.well-known/openid-configuration` e login web em produção depois. Rollback = voltar à imagem `:latest` anterior (guardar o digest antes).

**aecc-web:**
- **B-W0** Baseline: `lint`, `tsc`, Playwright (anotar o número exato).
- **B-W1** `app.config.ts`: plugin `expo-image-picker` com strings PT; corrigir o comentário do seeder/scheme. (Sem dependências.)
- **B-W2** `authApi.nativeLogin` + testes unitários do ramo nativo (a decidir: não há runner unitário no `package.json`; usar o Maestro + Playwright para a regressão web).
- **B-W3** `AuthContext`: `login` por plataforma; extrair o ramo web para o seu módulo para não haver `window`/`sessionStorage` no nativo; `src/pkce.ts` só no web. Web inalterada: Playwright tem de continuar verde.
- **B-W4** `confirm-email` nativo (ir para o login com aviso) e timeouts no cliente HTTP (H3) + `isRefreshing` por pedido.
- **B-W5** SecureStore: `keychainAccessible` e limpeza no primeiro arranque; revisão de tamanho do token.
- **B-W6** `StatusBar` e demais correções que a Fase C encontrar.
- **B-W7** Fluxos Maestro autenticados (§5.4).

### Fase C — volta de validação

`npx expo prebuild --clean` (ou `expo run:ios` / `run:android`), correr a matriz §5.2 nos três alvos, Maestro §5.4, capturas para `docs/redesign/baseline/<plataforma>/` e **parar para aprovação**.

### Dependências

| Pacote | Versão (SDK 55) | Estado | Justificação |
|---|---|---|---|
| `expo-secure-store` | `~55.0.18` | **já instalado** | tokens |
| `expo-image-picker` | `~55.0.24` | **já instalado** | só falta o plugin |
| `expo-status-bar` | `~55.0.6` | **já instalado** | ícones da status bar |
| `expo-linking` | `~55.0.17` | **já instalado** | deep links |
| `expo-web-browser` | `55.0.20` | **nova, só se (a)** | `ASWebAuthenticationSession`/Custom Tabs |
| `expo-auth-session` | `55.0.19` | **nova, só se (a)** | PKCE e redirect |
| `expo-crypto` | `55.0.19` | **nova, só se (a)** | `crypto.subtle` não existe no Hermes |

Versões lidas do tag `sdk-55` no npm; instalar sempre com `npx expo install`. **Com a opção (b) recomendada: zero dependências novas.** Nada foi instalado.

### Riscos

| Risco | Mitigação |
|---|---|
| **Deploy do aecc-api (tokens GHCR):** o deploy corre no CI com secrets do GitHub; se o login ao GHCR/SSH falhar, o grant novo não chega ao servidor e o nativo não loga. A web não é afetada (o cliente `aecc-web` não muda) | Deploy fora de hora, `curl` ao discovery e login web logo a seguir; guardar digest da imagem anterior para rollback. Não correr `docker buildx` manual (política do projeto) |
| **CORS:** o nativo **não** é afetado (`fetch` do RN não envia `Origin` e o CORS é uma restrição de browser). Confirmar na B-A3 com um pedido sem `Origin`. A web mantém `Cors:AllowedOrigins` | sem alterações de CORS |
| **Regressões no login da web** | B-A1 (caracterização) antes de mexer; ramo nativo isolado por plataforma; Playwright 9/9 em cada passo; `aecc-web` client intocado |
| Grant que aceita credenciais é alvo de força bruta | lockout do Identity já ativo (5/15 min) via `CheckPasswordSignInAsync(lockoutOnFailure:true)`; rate limiting; cliente dedicado; só HTTPS em produção |
| Token maior que o limite do SecureStore (Android) | medir em B-A4/B-W5 (§3) |
| Espaço em disco para o runtime iOS < 26 (~14 GB livres) | §5.1; alternativa `eas simulator` |
| NativeTabs é `unstable` no SDK 55 | plano B já documentado em `fase3-plano.md` §2.2 |
| Dev em Android: `localhost` aponta para o emulador | usar `https://aecc.salv4.com/api` ou `10.0.2.2` + cleartext só em dev |

---

## 7. Decisões que preciso de ti para avançar para a Fase B

1. **Opção de fluxo:** (b) grant dedicado `aecc-native` (recomendada), ou (a) browser do sistema (RFC 8252, exige páginas de login no servidor e perde o T1 no nativo).
2. **Nome do grant:** custom (`urn:aecc:grant-type:credentials`) ou `password` standard.
3. **Autorizar** trabalho no `aecc-api` (branch + PR + deploy via CI) e a correção do plugin `expo-image-picker` no `app.config.ts`.
4. **Runtime iOS < 26:** instalar localmente (7–8 GB, espaço apertado) ou usar `eas simulator`.
5. **Confirm-email no nativo:** ir para o login com aviso (mais simples) ou a API devolver o email para auto-login.
