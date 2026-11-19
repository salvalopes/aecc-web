#!/usr/bin/env bash
# Fluxos Maestro autenticados (Fase B). Uso:
#   e2e/maestro/native/run.sh <ios|android> [fluxo ...]
# Sem fluxos, corre todos (mais validacao-<cliente|associado|admin>-<light|dark>, só por pedido). Pré-requisitos:
#   - stack E2E do aecc-api em 127.0.0.1:5080 (docker compose -f docker-compose.e2e.yml up -d --build);
#   - build de desenvolvimento instalado e Metro a correr com a API da plataforma:
#       iOS:     EXPO_PUBLIC_API_URL=http://127.0.0.1:5080/api npx expo start --dev-client
#       Android: EXPO_PUBLIC_API_URL=http://10.0.2.2:5080/api  npx expo start --dev-client
#   - fluxos do mapa (mapa*.yaml): dev build com o MapLibre (npx expo run:ios|run:android) e tiles
#     da fixture local, nunca os de produção (a T1 pode não estar no ar):
#       node e2e/web/serve-static.mjs <pasta-vazia> 8090 e2e/web/fixtures/tiles
#       iOS:     ... EXPO_PUBLIC_TILES_URL=http://127.0.0.1:8090/tiles npx expo start
#       Android: o mesmo, com `adb reverse tcp:8090 tcp:8090` (e tcp:5080/tcp:8081), ou 10.0.2.2:8090.
#   - outra stack E2E (ex.: a API na 5081): E2E_HOST_API=http://127.0.0.1:5081/api e
#     E2E_API_CONTAINER=<contentor da API>.
# As credenciais vêm do .env.e2e do aecc-api (E2E_SEED_PASSWORD) e só entram no Maestro
# por -e; nunca são escritas em ficheiros nem impressas. Output em .artifacts/maestro/.
set -euo pipefail

PLATFORM=${1:?uso: run.sh <ios|android> [fluxo ...]}
shift
REPO=$(git rev-parse --show-toplevel)
MAIN_CHECKOUT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
ENV_FILE=${E2E_ENV_FILE:-$MAIN_CHECKOUT/../aecc-api/.env.e2e}
API=${E2E_HOST_API:-http://127.0.0.1:5080/api}
API_CONTAINER=${E2E_API_CONTAINER:-aecc-e2e-api-1}
FLOW_DIR="$REPO/e2e/maestro/native"
TAG=${RUN_TAG:-$PLATFORM}
OUT="$REPO/.artifacts/maestro/$TAG"
SHOTS="$REPO/docs/native/fase-c/$TAG"
LOGO="$REPO/e2e/web/fixtures/logo.png"

set -a
source "$ENV_FILE"
set +a
: "${E2E_SEED_PASSWORD:?E2E_SEED_PASSWORD em falta no $ENV_FILE}"

case "$PLATFORM" in
  ios)
    DEVICE=${MAESTRO_DEVICE:-$(xcrun simctl list devices booted | grep -m1 'iPhone 17 Pro (' | grep -oE '[0-9A-F-]{36}')}
    LINK_BASE='aecc://'
    xcrun simctl addmedia "$DEVICE" "$LOGO"
    ;;
  android)
    DEVICE=${MAESTRO_DEVICE:-emulator-5554}
    LINK_BASE='https://aecc.salv4.com/'
    adb -s "$DEVICE" push "$LOGO" /sdcard/Pictures/aecc-logo-e2e.png > /dev/null 2>&1
    adb -s "$DEVICE" shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
      -d file:///sdcard/Pictures/aecc-logo-e2e.png > /dev/null 2>&1
    ;;
  *) echo "plataforma desconhecida: $PLATFORM" >&2; exit 2 ;;
esac

# Último link enviado pelo ConsoleEmailSender da API E2E para <caminho> desde <instante>.
latest_link() {
  local path=$1 since=$2
  docker logs --since "$since" "$API_CONTAINER" 2>&1 \
    | grep -oE "$path\?userId=[A-Za-z0-9-]+&token=[A-Za-z0-9_-]+" | tail -1
}

# As leituras de empresas exigem sessão: token do associado (grant password do aecc-native).
company_logo() {
  local token
  token=$(token_request associado@e2e.test "$E2E_SEED_PASSWORD" | json_field access_token)
  curl -fsS -H "Authorization: Bearer $token" "$API/companies/e2e00000-0000-0000-0000-00000000c001" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).logoUrl??""))'
}

# Aparência do sistema (simulador iOS / emulador Android) para os ecrãs sem sessão (tema = sistema).
set_appearance() {
  case "$PLATFORM" in
    ios) xcrun simctl ui "$DEVICE" appearance "$1" ;;
    android) adb -s "$DEVICE" shell cmd uimode night "$([ "$1" = dark ] && echo yes || echo no)" > /dev/null ;;
  esac
}

json_field() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s)[process.argv[1]]??"")}catch{console.log("")}})' "$1"
}

# Pedido ao /connect/token (grant password do cliente aecc-native), resposta em JSON.
token_request() {
  curl -sS -X POST "$API/connect/token" -d grant_type=password -d client_id=aecc-native \
    --data-urlencode "username=$1" --data-urlencode "password=$2" \
    --data-urlencode 'scope=openid profile email offline_access roles aecc_api'
}

# Conta descartável (Cliente) criada pelo admin do seed: os fluxos de lockout e de conta
# desativada nunca tocam na conta do seed. Define THROW_ID, THROW_EMAIL e THROW_PASSWORD
# (palavra-passe aleatória, só em memória); apagada com drop_throwaway.
create_throwaway() {
  ADMIN_TOKEN=$(token_request admin@e2e.test "$E2E_SEED_PASSWORD" | json_field access_token)
  [ -n "$ADMIN_TOKEN" ] || return 1
  THROW_EMAIL="descartavel-$1-$TAG-$(date +%s)@e2e.test"
  THROW_PASSWORD="Aa1!$(openssl rand -hex 8)"
  THROW_ID=$(curl -fsS -X POST "$API/users" -H "authorization: Bearer $ADMIN_TOKEN" \
    -H 'content-type: application/json' \
    -d "{\"email\":\"$THROW_EMAIL\",\"password\":\"$THROW_PASSWORD\",\"fullName\":\"Descartavel\",\"role\":\"Cliente\"}" \
    | json_field id)
  [ -n "$THROW_ID" ]
}

drop_throwaway() {
  if [ -n "${THROW_ID:-}" ]; then
    curl -sS -o /dev/null -X DELETE "$API/users/$THROW_ID" -H "authorization: Bearer $ADMIN_TOKEN" || true
  fi
  THROW_ID=
}

# A conta do seed (associado) continua a entrar: prova de que não ficou bloqueada.
seed_login_works() {
  [ -n "$(token_request associado@e2e.test "$E2E_SEED_PASSWORD" | json_field access_token)" ]
}

if [ $# -gt 0 ]; then
  FLOWS=("$@")
else
  FLOWS=(login logout sessao-restaurada diretorio detalhe editar-empresa-imagem perfil-aparencia
    sem-permissao deeplink-reset-password deeplink-confirm-email teclado-auth teclado-formulario sem-permissao-users deeplink-users-admin gestao-utilizadores
    login-bloqueio login-desativada lightbox mapa mapa-posicao mapa-posicao-negada)
fi

rm -rf "$OUT"
mkdir -p "$OUT" "$SHOTS"
SUMMARY="$OUT/summary.txt"
: > "$SUMMARY"
STATUS=0

for flow in "${FLOWS[@]}"; do
  # Produto do seed com imagens carregadas pela API (plano §8.5). No Android, o 2.º, carregado
  # com o URL público do storage a apontar para 10.0.2.2.
  PRODUCT="Pastel de Nata"
  [ "$PLATFORM" = android ] && PRODUCT="Bolo de Aniversário"
  EXTRA=(-e "PRODUCT=$PRODUCT")
  EMAIL=associado@e2e.test
  case "$flow" in
    login)
      UNCONFIRMED_EMAIL="por-confirmar-$PLATFORM-$(date +%s)@e2e.test"
      curl -fsS -o /dev/null -X POST "$API/auth/register" \
        -H 'content-type: application/json' -d "{\"email\":\"$UNCONFIRMED_EMAIL\"}"
      EXTRA+=(-e "UNCONFIRMED_EMAIL=$UNCONFIRMED_EMAIL")
      ;;
    login-bloqueio|login-desativada)
      if ! create_throwaway "$flow"; then
        echo "$flow: não foi possível criar a conta descartável" >> "$SUMMARY"; STATUS=1; continue
      fi
      if [ "$flow" = login-bloqueio ]; then
        # Identity: MaxFailedAccessAttempts = 5. Pausa entre pedidos para ficar abaixo do rate limit.
        for n in 1 2 3 4 5; do
          token_request "$THROW_EMAIL" "errada-$n" > /dev/null
          sleep 1
        done
      else
        curl -fsS -o /dev/null -X PUT "$API/users/$THROW_ID" -H "authorization: Bearer $ADMIN_TOKEN" \
          -H 'content-type: application/json' \
          -d '{"fullName":"Descartavel","role":"Cliente","isActive":false}'
      fi
      EXTRA+=(-e "THROWAWAY_EMAIL=$THROW_EMAIL" -e "THROWAWAY_PASSWORD=$THROW_PASSWORD")
      ;;
    deeplink-users-admin|gestao-utilizadores)
      EMAIL=admin@e2e.test
      ;;
    deeplink-reset-password)
      EMAIL=cliente@e2e.test
      since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
      curl -fsS -o /dev/null -X POST "$API/auth/forgot-password" \
        -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\"}"
      sleep 2
      query=$(latest_link 'reset-password' "$since")
      [ -n "$query" ] || { echo "$flow: link de reset não encontrado no log" >> "$SUMMARY"; STATUS=1; continue; }
      EXTRA+=(-e "RESET_LINK=$LINK_BASE$query")
      ;;
    deeplink-confirm-email)
      NEW_EMAIL="nativo-$PLATFORM-$(date +%s)@e2e.test"
      since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
      curl -fsS -o /dev/null -X POST "$API/auth/register" \
        -H 'content-type: application/json' -d "{\"email\":\"$NEW_EMAIL\"}"
      sleep 2
      query=$(latest_link 'confirm-email' "$since")
      [ -n "$query" ] || { echo "$flow: link de confirmação não encontrado no log" >> "$SUMMARY"; STATUS=1; continue; }
      EXTRA+=(-e "CONFIRM_LINK=$LINK_BASE$query" -e "NEW_EMAIL=$NEW_EMAIL")
      ;;
  esac

  # validacao-<papel>-<tema> (ex.: validacao-admin-dark) corre validacao.yaml com esse papel e tema.
  FLOW_FILE=$flow
  case "$flow" in
    validacao-auth-*)
      THEME=${flow#validacao-auth-}
      FLOW_FILE=validacao-auth
      EXTRA+=(-e "THEME=$THEME")
      set_appearance "$THEME"
      ;;
    validacao-*)
      IFS=- read -r _ ROLE THEME <<< "$flow"
      FLOW_FILE=validacao
      EMAIL=$ROLE@e2e.test
      EXTRA+=(-e "ROLE=$ROLE" -e "THEME=$THEME")
      ;;
  esac

  [ "$flow" = editar-empresa-imagem ] && LOGO_BEFORE=$(company_logo)

  set +e
  # Limite por fluxo: um driver do Maestro pendurado não pode prender a execução toda.
  perl -e 'alarm shift; exec @ARGV' "${FLOW_TIMEOUT_S:-600}" \
    maestro --device "$DEVICE" test --test-output-dir "$OUT/$flow" --debug-output "$OUT/$flow/debug" \
    -e "EMAIL=$EMAIL" -e "PASSWORD=$E2E_SEED_PASSWORD" ${EXTRA[@]+"${EXTRA[@]}"} \
    "$FLOW_DIR/$FLOW_FILE.yaml" > "$OUT/$flow.log" 2>&1
  code=$?
  set -e
  # O debug do Maestro (commands*.json, maestro.log) grava os valores de -e resolvidos:
  # fica só com as imagens (capturas e a da falha) e o log da consola.
  find "$OUT/$flow" -type f ! -name '*.png' -delete
  case "$flow" in
    login-bloqueio|login-desativada)
      drop_throwaway
      if seed_login_works; then
        echo "$flow: a conta do seed continua a entrar" >> "$SUMMARY"
      else
        echo "$flow: a conta do seed NÃO entra" >> "$SUMMARY"; STATUS=1
      fi
      ;;
  esac
  case "$flow" in validacao-auth-*) set_appearance light ;; esac
  steps=$(grep -cE 'COMPLETED' "$OUT/$flow.log" || true)
  echo "$flow: exit $code, passos COMPLETED $steps" >> "$SUMMARY"
  [ $code -eq 0 ] || STATUS=1
  if [ "$flow" = editar-empresa-imagem ]; then
    # Prova do lado da API: o upload trocou o logoUrl. (No emulador Android a imagem não
    # aparece: o storage E2E devolve URLs em localhost, que lá é o próprio dispositivo.)
    if [ -n "$(company_logo)" ] && [ "$(company_logo)" != "$LOGO_BEFORE" ]; then
      echo "$flow: logoUrl da empresa mudou na API (upload OK)" >> "$SUMMARY"
    else
      echo "$flow: logoUrl NÃO mudou na API" >> "$SUMMARY"
      STATUS=1
    fi
  fi
  find "$OUT/$flow" -name '*.png' -path '*/takeScreenshot/*' \
    -exec cp {} "$SHOTS/" \; 2>/dev/null || true
done

if grep -rqF -- "$E2E_SEED_PASSWORD" "$OUT" 2>/dev/null; then
  echo "AVISO: a password aparece no output em $OUT (não partilhar)" >> "$SUMMARY"
  STATUS=1
fi

cat "$SUMMARY"
exit $STATUS
