#!/usr/bin/env bash
# Fluxos Maestro autenticados (Fase B). Uso:
#   e2e/maestro/native/run.sh <ios|android> [fluxo ...]
# Sem fluxos, corre todos. Pré-requisitos:
#   - stack E2E do aecc-api em 127.0.0.1:5080 (docker compose -f docker-compose.e2e.yml up -d --build);
#   - build de desenvolvimento instalado e Metro a correr com a API da plataforma:
#       iOS:     EXPO_PUBLIC_API_URL=http://127.0.0.1:5080/api npx expo start --dev-client
#       Android: EXPO_PUBLIC_API_URL=http://10.0.2.2:5080/api  npx expo start --dev-client
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
OUT="$REPO/.artifacts/maestro/$PLATFORM"
SHOTS="$REPO/docs/native/fase-b/$PLATFORM"
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

company_logo() {
  curl -fsS "$API/companies/e2e00000-0000-0000-0000-00000000c001" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).logoUrl??""))'
}

if [ $# -gt 0 ]; then
  FLOWS=("$@")
else
  FLOWS=(login logout sessao-restaurada diretorio detalhe editar-empresa-imagem perfil-aparencia
    sem-permissao deeplink-reset-password deeplink-confirm-email)
fi

rm -rf "$OUT"
mkdir -p "$OUT" "$SHOTS"
SUMMARY="$OUT/summary.txt"
: > "$SUMMARY"
STATUS=0

for flow in "${FLOWS[@]}"; do
  EXTRA=()
  EMAIL=associado@e2e.test
  case "$flow" in
    login)
      UNCONFIRMED_EMAIL="por-confirmar-$PLATFORM-$(date +%s)@e2e.test"
      curl -fsS -o /dev/null -X POST "$API/auth/register" \
        -H 'content-type: application/json' -d "{\"email\":\"$UNCONFIRMED_EMAIL\"}"
      EXTRA+=(-e "UNCONFIRMED_EMAIL=$UNCONFIRMED_EMAIL")
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

  [ "$flow" = editar-empresa-imagem ] && LOGO_BEFORE=$(company_logo)

  set +e
  # Limite por fluxo: um driver do Maestro pendurado não pode prender a execução toda.
  perl -e 'alarm shift; exec @ARGV' "${FLOW_TIMEOUT_S:-600}" \
    maestro --device "$DEVICE" test --test-output-dir "$OUT/$flow" --debug-output "$OUT/$flow/debug" \
    -e "EMAIL=$EMAIL" -e "PASSWORD=$E2E_SEED_PASSWORD" ${EXTRA[@]+"${EXTRA[@]}"} \
    "$FLOW_DIR/$flow.yaml" > "$OUT/$flow.log" 2>&1
  code=$?
  set -e
  # O debug do Maestro (commands*.json, maestro.log) grava os valores de -e resolvidos:
  # fica só com as imagens (capturas e a da falha) e o log da consola.
  find "$OUT/$flow" -type f ! -name '*.png' -delete
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
