# Upgrade Expo SDK 52 → 55 — plano (Fase A)

Estado: **plano, à espera de aprovação**. Branch `chore/expo-sdk-55` (a partir de `origin/main` @ `619fd16`).
Objetivo: SDK 55 sem alterar comportamento nem visual. Upgrade incremental 52→53→54→55, um commit por SDK.

Fontes usadas (lidas nesta sessão, não de memória):

- Changelogs oficiais: [SDK 53](https://expo.dev/changelog/sdk-53) · [SDK 54](https://expo.dev/changelog/sdk-54) · [SDK 55](https://expo.dev/changelog/sdk-55)
- Tabela de versões/plataformas: [docs.expo.dev/versions/v55.0.0](https://docs.expo.dev/versions/v55.0.0/)
- Versões exatas por SDK: `bundledNativeModules.json` dos tarballs `expo@53.0.27`, `expo@54.0.38`, `expo@55.0.32` (npm)
- CHANGELOGs de pacote: [expo-router](https://github.com/expo/expo/blob/main/packages/expo-router/CHANGELOG.md), [expo-font](https://github.com/expo/expo/blob/main/packages/expo-font/CHANGELOG.md), [expo-splash-screen](https://github.com/expo/expo/blob/main/packages/expo-splash-screen/CHANGELOG.md), [expo-blur](https://github.com/expo/expo/blob/main/packages/expo-blur/CHANGELOG.md)

---

## 1. Versões atuais e alvo

`ios/` e `android/` estão no `.gitignore` → projeto **CNG** (gerado por `expo prebuild` / `expo run:*`). Não há `app.json`, `babel.config.js`, `metro.config.js` nem `patches/`. Não há `expo.install.exclude`, `overrides` nem `resolutions`.

| Pacote | Atual (instalado) | SDK 53 | SDK 54 | SDK 55 |
|---|---|---|---|---|
| expo | ~52.0.46 (52.0.49) | 53.0.27 | 54.0.38 | 55.0.32 |
| react | 18.3.1 | 19.0.0 | 19.1.0 | 19.2.0 |
| react-native | 0.76.9 | 0.79.6 | 0.81.5 | 0.83.10 |
| expo-router | ~4.0.20 (4.0.22) | ~5.1.11 | ~6.0.24 | ~55.0.18 |
| @expo/metro-runtime | ~4.0.1 | ~5.0.5 | ~6.1.2 | ~55.0.12 |
| expo-asset | ~11.0.5 | ~11.1.7 | ~12.0.14 | ~55.0.20 |
| expo-blur | ~14.0.3 | ~14.1.5 | ~15.0.8 | ~55.0.18 |
| expo-font | ~13.0.4 | ~13.3.2 | ~14.0.12 | ~55.0.8 |
| expo-image-picker | ~16.0.6 | ~16.1.4 | ~17.0.11 | ~55.0.24 |
| expo-secure-store | ~14.0.1 | ~14.2.4 | ~15.0.8 | ~55.0.18 |
| expo-splash-screen | ~0.29.24 | ~0.30.10 | ~31.0.13 | ~55.0.25 |
| expo-status-bar | ~2.0.1 | ~2.2.3 | ~3.0.9 | ~55.0.6 |
| react-native-web | ~0.19.13 | ~0.20.0 | ~0.21.0 | ~0.21.0 |
| react-native-svg | 15.8.0 | 15.11.2 | 15.12.1 | 15.15.3 |
| react-native-screens | ~4.4.0 | ~4.11.1 | ~4.16.0 | ~4.23.0 |
| react-native-safe-area-context | 4.12.0 | 5.4.0 | ~5.6.0 | ~5.6.2 |
| @react-native-async-storage/async-storage | 2.1.2 | 2.1.2 | 2.2.0 | 2.2.0 |
| eslint-config-expo (dev) | ~8.0.0 | ~9.2.0 | ~10.0.0 | ~55.0.1 |
| typescript (dev) | ~5.3.3 | ~5.8.3 (recomendado) | ~5.9.2 (recomendado) | ~5.9.x |
| @types/react (dev) | ~18.3.12 | ~19.0.x | ~19.1.x | ~19.2.x (o `--fix` decide) |

Transitivas relevantes (não diretas hoje): `react-dom` 18.3.1 (via peer de `react-native-web`), `expo-constants` 17.0.8, `expo-linking` 7.0.5, `@react-navigation/native` 7.3.4 (importado diretamente em `app/_layout.tsx`).

`app.config.ts`: `plugins: ['expo-router', 'expo-secure-store']`, `experiments.typedRoutes: true`, `web.bundler: 'metro'`, `web.output: 'single'`, `splash` legado no topo (imagem `./assets/splash.png`, fundo `#ffffff`), sem `newArchEnabled`, sem `edgeToEdgeEnabled`, sem `notification`, sem `jsEngine`.

Toolchain local: Node 25.3.0 (suportado no SDK 55: `^20.19.4 | ^22.13.0 | ^24.3.0 | ^25.0.0`), Xcode 26.3 (SDK 55 exige ≥ 26.2), JDK 21 disponível. CI usa Node 20 → precisa de ≥ 20.19.4 (`setup-node` com `node-version: 20` resolve para a última 20.x — OK, mas convém confirmar no primeiro run).

### Dependências diretas novas (para aprovação)

Exigidas pelo upgrade — **peço aprovação**:

| Pacote | Porquê | Fonte |
|---|---|---|
| `expo-constants` | peer **obrigatório** de `expo-router@55` (`"expo-constants": "^55.0.17"`, não opcional); a skill expo-upgrade manda mantê-lo direto sempre que há expo-router (senão pode partir autolinking nativo fora do Expo Go) | `package.json` de expo-router 55.0.18 |
| `expo-linking` | peer **obrigatório** de `expo-router@55` (`"^55.0.17"`) | idem |
| `react-dom` | hoje vem só como peer auto-instalado de `react-native-web`; com React 19 tem de ser **exatamente** a versão do `react` (19.x.0) ou o build web falha com "Incompatible React versions". Fixar via `npx expo install react-dom` | tabela SDK: React 19.0.0/19.1.0/19.2.0 |

Opcional (não exigida; decisão tua):

- `@react-navigation/native` direta — `app/_layout.tsx` importa `DefaultTheme/DarkTheme/ThemeProvider` de um pacote que só existe como dependência transitiva do expo-router (`^7.1.33` em 55). Funciona hoje e continuará a funcionar no 55; a recomendação é **não adicionar** agora e apenas registar como dívida (em SDK 56+ a Expo migra estes imports para `expo-router` — skill `react-navigation-to-expo-router`).

Instaladas pelo próprio expo-router 55 como dependências dele (não diretas, não exigem aprovação mas ficam autolinkadas no nativo): `expo-glass-effect`, `expo-image`, `expo-symbols`, `expo-server`. Nada a fazer.

`@expo/log-box@55.0.13` (peer do router 55) já vem como dependência do `expo@55`.

---

## 2. Breaking changes que afetam ESTE projeto

Filtrado por aquilo que o código usa (`grep` em `app/` e `src/`): expo-router (Stack, Tabs, `router.replace/push`, `+not-found`, typedRoutes), expo-blur (`BlurView intensity/tint`, sem `experimentalBlurMethod`), expo-font `useFonts`, expo-splash-screen (`preventAutoHideAsync/hideAsync`), SecureStore/AsyncStorage, `SafeAreaView` **de react-native-safe-area-context** (não do RN), `createContext/useContext/.Provider`, react-native-svg, expo-image-picker.

### 52 → 53 ([changelog](https://expo.dev/changelog/sdk-53))

| Mudança | Impacto aqui | Ação |
|---|---|---|
| **New Architecture ligada por omissão** | Hoje o prebuild gera `newArchEnabled=false` (default SDK 52). Passa a `true` no nativo. Web não é afetada. | Ver §3. Proposta: aceitar o default já no 53. |
| React 19 ([guia](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)) | Não usamos `forwardRef`/`propTypes`/`defaultProps` em function components/string refs (a confirmar com `tsc`). `@types/react` 19 pode apontar tipos (`useRef` exige argumento, `JSX` global removido). | Corrigir só erros de tipos, sem mudar comportamento. |
| `package.json` `exports` ativo no Metro (RN 0.79) | Sem libs da lista de incompatíveis (supabase/firebase). | Nenhuma; vigiar erros de resolução no `expo export`. |
| react-native-web 0.20 | Toda a app web. | Playwright + screenshots. |
| Imports internos `react-native/...` passam a `export` | Não usamos (`grep react-native/Libraries` vazio). | Nenhuma. |
| Polyfill `setImmediate` removido | Não usado. | Nenhuma. |
| Package Android deixa de ser scheme automático no prebuild | Login nativo não é suportado (smoke não o testa); `scheme` não está definido. | Nenhuma agora; registar. |
| AppTheme Android passa a DayNight em CNG | Pode mudar cor do splash/status bar em dark mode no Android. | Verificar no AVD. |
| Edge-to-edge: desligado por omissão em projetos existentes no 53 | — | Nenhuma no 53. |
| expo-router 5: app envolvida num `<Slot/>` raiz ([#35613](https://github.com/expo/expo/pull/35613)) e `UNSTABLE_router`/`dangerouslySingular` | Temos redirect inicial via `router.replace` em `useEffect` (`app/(app)/_layout.tsx:44-48`). A mudança visa precisamente tornar redirects iniciais fiáveis — pode alterar timing. | Coberto pelos specs `auth`/redirect do Playwright. |
| JSC deprecado (`jsEngine`) | Usamos Hermes (default). | Nenhuma. |
| Node ≥ 20 | OK. | — |

### 53 → 54 ([changelog](https://expo.dev/changelog/sdk-54))

| Mudança | Impacto aqui | Ação |
|---|---|---|
| **Edge-to-edge obrigatório no Android** (sem opt-out) | Ecrãs nativos Android passam a desenhar por baixo da status/nav bar. `Modal.tsx` usa `SafeAreaView` de safe-area-context e o layout usa `useSafeAreaInsets` → deve absorver. **Pode mudar o visual no Android.** | Verificar no AVD; não "corrigir" estilos sem aprovação. Web/iOS não afetados. |
| RN 0.81 / React 19.1, targetSdk 36 | Nativo Android. | §4. |
| `<SafeAreaView>` do RN deprecado | Não usamos o do RN. | Nenhuma. |
| `experimentalImportSupport` e live bindings ligados por omissão no Metro | Não temos `metro.config.js`; pode mudar ordem de avaliação de módulos com ciclos. | Vigiar no `expo export` + e2e. |
| Rejeições de promise não tratadas passam a erro (LogBox vermelho em dev) | `AsyncStorage.getItem(...).then` sem `catch` em `ThemeContext.tsx:48`; `SplashScreen.preventAutoHideAsync()` sem `catch`. Só dev, sem impacto em produção. | Registar; não alterar. |
| expo-router 6: `expo-router/testing-library` exige peer separado | Não usamos. | Nenhuma. |
| TypeScript recomendado ~5.9.2; eslint-config-expo ~10 | `.eslintrc.js` em formato legado (eslint 8). | **Risco**: ver §6 (R3). |
| Último SDK com Legacy Architecture | — | §3. |
| expo-file-system / notifications / vector-icons | Não usados. | Nenhuma. |

### 54 → 55 ([changelog](https://expo.dev/changelog/sdk-55))

| Mudança | Impacto aqui | Ação |
|---|---|---|
| **Legacy Architecture removida**; `newArchEnabled` removido da config | Não temos o campo. | Nenhuma (já ligada desde o 53). |
| Versões de pacotes Expo passam a `^55.x` | Só números. | `--fix`. |
| `app.config.ts` passa a ser transpilado com o **TypeScript instalado** | Precisa de TS compatível instalado (o `--fix`/doctor deve alinhar). | Confirmar que `expo config` corre. |
| expo-blur: `experimentalBlurMethod`→`blurMethod`; `dimezisBlurView` exige `BlurTargetView` | Não usamos `experimentalBlurMethod` → Android continua no fallback translúcido. Changelog diz que é não-breaking para quem não muda. | Nenhuma. |
| expo-status-bar: `backgroundColor`/`translucent` deprecados; `androidStatusBar.*` deprecado | Não usamos (`grep StatusBar` vazio no código; `expo-status-bar` é dependência sem uso). | Nenhuma. |
| expo-router 55: `reset`→`resetOnFocus` (headless tabs), NativeTabs `options`→`unstable_nativeProps`, remoção de `ExpoRequest/ExpoResponse` | Não usamos headless tabs, NativeTabs nem `expo-router/server`. | Nenhuma. |
| react-native-screens 4.23 (via router); "synchronous layout updates" ligado | Tabs/Stack. | Playwright + screenshots + smoke iOS. |
| `edgeToEdgeEnabled` e `notification` removidos do app config | Não usamos. | Nenhuma. |
| Fast resolver / `EXPO_USE_FAST_RESOLVER` e `experiments.reactCanary` removidos | Não usamos. | Nenhuma. |
| Hermes V1 opt-in | **Não ativar** (a skill avisa de regressão de memória com Hermes V1 no 55). | Nenhuma. |
| Xcode ≥ 26.2, iOS ≥ 15.1 | Xcode 26.3 local. | OK. |
| `eas update` exige `--environment` | Não usamos EAS Update. | Nenhuma. |

Pacotes sem breaking changes no intervalo (CHANGELOGs lidos): expo-splash-screen (0.29→55: nenhum), expo-font (13→55: só bumps de plataforma mínima iOS 15.1 / macOS 11). Sem informação específica nos changelogs para expo-image-picker, expo-secure-store, async-storage, react-native-svg, safe-area-context 4→5 — validação por testes.

> Nota: a SDK atual é a 58 e a skill expo-upgrade recomenda, para quem sai de ≤ 55, saltar a 56 e ir para a 57 (≥ 57.0.9). O alvo 55 está fixado por ti; fica registado para a fase seguinte.

---

## 3. New Architecture

- **Estado atual:** desligada no nativo. O prebuild do SDK 52 gerou `android/gradle.properties: newArchEnabled=false` e `ios/Podfile.properties.json: "newArchEnabled": "false"`; `app.config.ts` não define o campo (default do SDK 52 = false). Web não tem arquitetura nativa — não é afetada.
- **SDK 53:** passa a ligada por omissão (opt-out possível). **SDK 54:** último com Legacy. **SDK 55:** só New Arch.
- **Dependências nativas e compatibilidade:** todas suportam New Arch nas versões alvo — módulos Expo (asset, blur, font, image-picker, secure-store, splash-screen, status-bar, constants, linking, router e as transitivas glass-effect/image/symbols), `react-native-screens` 4.x, `react-native-safe-area-context` 5.x, `react-native-svg` 15.x, `@react-native-async-storage/async-storage` 2.x. **Nenhuma dependência incompatível identificada.** Não temos reanimated, gesture-handler nem libs de terceiros com módulo nativo próprio além destas. (Confirmação final: `npx expo-doctor` no SDK 55, que verifica a React Native Directory.)
- **Proposta:** aceitar o default (New Arch ligada) no commit do SDK 53, sem `newArchEnabled: false` temporário — ao 55 é obrigatório de qualquer forma, e assim não há config para pôr e tirar. Contrapartida: o nativo só é validado no fim (smoke iOS no 55, como pediste). Se preferires isolar, alternativa: smoke iOS também após o 53.

---

## 4. Android — requisitos do SDK 55 e comandos (não executados)

Requisitos ([tabela oficial](https://docs.expo.dev/versions/v55.0.0/)): **compileSdkVersion 36, targetSdkVersion 36**, Android 7+ (minSdk 24, igual ao atual). Exemplo oficial de build-properties usa `buildToolsVersion "36.0.0"`.

Estado local (`~/Library/Android/sdk`): platforms 28/32/35; build-tools até 35.0.0; NDK 26.1; system image só `android-32/google_apis/arm64-v8a`; AVD `Pixel_3a_API_32_arm64-v8a`; **emulator 31.2.9 (2022)**; só o `sdkmanager` legado em `tools/bin` (não funciona com JDK 21); **sem `cmdline-tools`**; sem Android Studio; `adb`/`emulator` fora do `PATH`.

Comandos para correres tu (não instalo ferramentas de sistema):

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export ANDROID_HOME="$HOME/Library/Android/sdk"

# 1) cmdline-tools atuais (o sdkmanager de tools/bin é legado e falha com JDK 21).
#    Descarregar "Command line tools only" (macOS) de https://developer.android.com/studio#command-line-tools-only
#    e extrair para $ANDROID_HOME/cmdline-tools/latest  (ficando .../latest/bin/sdkmanager)
#    ou, alternativa via Homebrew:  brew install --cask android-commandlinetools

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# 2) Pacotes do SDK exigidos pelo SDK 55 + emulator recente (API 36 precisa de emulator ≥ 35.x)
sdkmanager --licenses
sdkmanager --install "platform-tools" "emulator" "platforms;android-36" "build-tools;36.0.0" \
  "system-images;android-36;google_apis;arm64-v8a"

# 3) AVD novo (API 36, arm64 para M1/M2)
avdmanager create avd -n Pixel_8_API_36 -k "system-images;android-36;google_apis;arm64-v8a" -d pixel_8

# 4) Arrancar
emulator -avd Pixel_8_API_36 -no-snapshot-load &
```

NDK: o Gradle do RN 0.83 descarrega a versão de `ndkVersion` sozinho se as licenças estiverem aceites; depois do prebuild confirmo com `grep ndkVersion android/build.gradle` e, se não descarregar, dou-te o `sdkmanager --install "ndk;<versão>"` exato.

---

## 5. Ecrã branco no Android — avaliação (sem correção)

Código atual (`app/_layout.tsx`):

```tsx
SplashScreen.preventAutoHideAsync();
const [fontsLoaded] = useFonts({ LibreFranklin: require(...Variable.ttf), SourceSans3: require(...Variable.ttf) });
useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync(); }, [fontsLoaded]);
if (!fontsLoaded) return null;
```

**Hipótese H1 — fontes (a tua):** `useFonts` devolve `[loaded, error]`; só lemos `loaded`. Se o carregamento falhar no Android (ex.: TTF variável rejeitado pelo `Typeface` nativo, asset não empacotado), `loaded` fica `false` para sempre → `hideAsync()` nunca é chamado e a raiz devolve `null`. Sintoma: ou fica o splash (fundo `#ffffff` + `splash.png` — num Android 12+ o splash nativo mostra só o ícone ao centro, pode parecer "branco"), ou branco puro se o splash for escondido por outra via. **Plausível**, e consistente com o ecrã ser branco (o splash é branco).
Nota: mesmo que carreguem, TTFs variáveis no Android só expõem a instância por omissão do eixo `wght` — isso daria pesos errados, **não** ecrã branco.

**Hipótese H2 — redirect inicial (concorrente):** a rota inicial é `app/(app)/index.tsx`; `app/(app)/_layout.tsx` devolve `null` enquanto `isLoading`/sem token e faz `router.replace('/(auth)/login')` num `useEffect`. Se esse `replace` correr antes de o navigator raiz estar montado ("Attempted to navigate before mounting the Root Layout component"), é ignorado e o layout fica em `null` → **branco puro**, com fundo do tema de navegação. Funciona em iOS/web por timing. O SDK 53 (router 5, root `<Slot/>`) mexe exatamente neste caminho — pode resolver ou mudar o sintoma.

**Hipótese H3 — arranque da sessão pendurado:** `AuthContext` lê SecureStore e, se houver token, chama a API em `EXPO_PUBLIC_API_URL`; se o `.env` apontar para `localhost`, no emulador isso é o próprio emulador (deveria ser `10.0.2.2`) → fetch pendurado até timeout → `isLoading` true → `null`. Só se aplica com token guardado; o smoke usa `clearState: true`, por isso menos provável.

**Diagnóstico proposto (no AVD API 36, depois do SDK 55, output para `.artifacts/`):**

```bash
mkdir -p .artifacts/android
adb logcat -c
npx expo run:android > .artifacts/android/run-android.log 2>&1   # build + install + Metro
adb logcat -v time > .artifacts/android/logcat.log 2>&1 &         # captura completa
# depois do arranque (≈60 s), filtrar:
grep -E "ReactNativeJS|ExpoFont|FontLoader|Typeface|SplashScreen|Attempted to navigate|Unhandled|FATAL|AndroidRuntime" \
  .artifacts/android/logcat.log | tail -50
```

Discriminação:
- `ExpoFont`/`Typeface`/"Could not load font" ou rejeição de promise de `loadAsync` → **H1**.
- "Attempted to navigate before mounting" ou nenhum erro com JS a correr (há `ReactNativeJS` logs) e splash já escondido → **H2**.
- Pedido de rede pendente/timeout para `localhost` → **H3**.
- Complemento sem alterar código: `adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml .artifacts/android/` — se existir `login.screen` na árvore mas invisível é outro problema (render), se a árvore estiver vazia é H1/H2; e o React Native DevTools (tecla `j` no Metro) para ver o estado de `useFonts` e da navegação.

Correção possível (só depois de aprovares, conforme o resultado): H1 → tratar `fontError` (`if (!fontsLoaded && !fontError) return null;` + `hideAsync` também em erro) e/ou fontes estáticas por peso; H2 → redirect declarativo (`<Redirect/>`) em vez de `useEffect`; H3 → URL da API para emulador.

---

## 6. Plano de verificação por passo

Para cada SDK *N* ∈ {53, 54, 55} (todos os outputs em `.artifacts/sdk<N>/`, mostro só resumo / últimas 30 linhas em falha):

1. `npx expo install expo@^<N>.0.0 --fix > .artifacts/sdk<N>/install.log` (no 53 inclui também `npx expo install expo-constants expo-linking react-dom` — se aprovado).
2. `npx expo-doctor > .artifacts/sdk<N>/doctor.log` → **zero erros**.
3. `npm run lint > .artifacts/sdk<N>/lint.log` e `npx tsc --noEmit > .artifacts/sdk<N>/tsc.log` → zero erros. Correções só de tipos/config, sem mudar comportamento.
4. `npx expo config --type public > /dev/null` (garante que `app.config.ts` transpila — relevante no 55).
5. Stack E2E local do `aecc-api` em `:5080`; variáveis E2E carregadas no shell a partir da configuração local do `aecc-api` (a password nunca aparece em comandos/logs/relatório) → `npx playwright test > .artifacts/sdk<N>/playwright.log` → **8/8**.
6. Commit `chore(expo): upgrade to SDK <N>` (só `package.json`, `package-lock.json` e eventuais correções de tipos).

No fim (SDK 55):

7. iOS: `npx expo run:ios` (prebuild limpo — `ios/` regenerado) + `maestro test --test-output-dir .artifacts/maestro e2e/maestro/native/smoke-public.yaml`.
8. Web baseline: `npm run baseline:web` com output para pasta separada (ex. `docs/redesign/baseline-sdk55/web/`, sem sobrescrever `docs/redesign/baseline/web/`) e comparação pixel a pixel com a baseline atual; lista de diferenças.
9. Android: AVD API 36 (§4, depois de instalares); se ecrã branco → §5; correção só com aprovação.
10. `docs.expo.dev/versions/` em ficheiros de instruções: não há (`AGENTS.md` não existe) — nada a atualizar.

## 7. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | `react-dom` transitivo fica desalinhado de `react` (19.x) → web parte | Adicionar `react-dom` direto via `expo install` (§1). |
| R2 | New Arch + edge-to-edge alteram visual/comportamento **nativo** (Android sobretudo) | Smoke iOS + AVD; reportar diferenças em vez de "corrigir" estilos. |
| R3 | `eslint-config-expo` 9/10/55 pode exigir ESLint 9 / flat config; o `.eslintrc.js` atual é legado (eslint 8) | Se o `lint` partir, paro e proponho: (a) manter eslint 8 + versão compatível da config, ou (b) migrar para `eslint.config.js` — é mudança de estrutura, só com aprovação. |
| R4 | `@types/react` 19 / TS 5.8–5.9 geram erros de tipos | Corrigir só anotações; zero mudanças de runtime. |
| R5 | Router 5 (`<Slot/>` raiz) muda timing do redirect inicial | Specs de auth do Playwright; screenshots. |
| R6 | Mudanças de render do RNW 0.20/0.21 (ex. sombras, `fontWeight` com fontes variáveis) | Comparação de screenshots no fim; se houver diferenças, listo-as antes de qualquer ação. |
| R7 | Node 20 no CI < 20.19.4 | `setup-node` com `20` resolve para a última 20.x; confirmar no 1.º run do CI (não faço push). |
| R8 | Acoplamento do gate e2e à imagem `aecc-api:latest` | Testes locais contra a stack E2E local, igual ao CI. |
| R9 | Toolchain Android desatualizado bloqueia o passo 9 | Comandos em §4; se não estiver instalado quando lá chegar, paro e peço. |
| R10 | SDK 55 já não é o mais recente (58); skill recomenda 57.0.9+ a seguir | Fora de âmbito; registar como próximo passo. |

## Pedido de aprovação

1. Adicionar como dependências diretas: `expo-constants`, `expo-linking`, `react-dom` (versões fixadas pelo `expo install`).
2. `@react-navigation/native` direta: **não** (recomendado) / sim.
3. New Arch: aceitar o default no SDK 53 (recomendado) / opt-out temporário até ao 54.
4. Pasta das screenshots novas: `docs/redesign/baseline-sdk55/web/` (ok?). O destino está fixo em `e2e/web/baseline/screens.spec.ts:10` (`OUT = docs/redesign/baseline/web`). Proposta mínima: `const OUT = process.env.BASELINE_OUT ?? <atual>` (default inalterado), em commit próprio `test(e2e): BASELINE_OUT configurável`. Alternativa sem tocar código: correr para a pasta atual e repor os originais com `git checkout` depois de copiar — mais frágil.
5. Instalar o toolchain Android (§4) quando puderes — só preciso antes do passo 9.
