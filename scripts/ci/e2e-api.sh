#!/usr/bin/env bash
# Stack E2E da API para o CI: Postgres descartável + aecc-api (ambiente E2E) + seed-e2e.
#
# Fonte única desta stack, usada por:
#   - aecc-web  .github/workflows/deploy.yml  (gate `e2e`, imagem fixada por digest)
#   - aecc-api  .github/workflows/pr-checks.yml (E2E do web contra a imagem do PR)
# O aecc-api faz checkout do aecc-web no main e chama este script: mudanças aqui afetam
# os dois repos. Manter a interface estável (subcomandos e variáveis abaixo).
#
# Uso:
#   AECC_API_IMAGE=<imagem> E2E_SEED_PASSWORD=<pw> scripts/ci/e2e-api.sh up
#   scripts/ci/e2e-api.sh logs     # logs da API (para um step `if: always()`)
#   scripts/ci/e2e-api.sh down     # remove contentores e rede (opcional no CI)
#
# `up` levanta a BD e a API em http://localhost:5080, espera por GET /api/categories
# (anónimo e lê a BD; as empresas exigem sessão desde o aecc-api#7) e corre seed-e2e.
# Os valores da BD são os do docker-compose.e2e.yml do aecc-api e não são segredos.
set -euo pipefail

NETWORK=aecc-e2e
DB_CONTAINER=aecc-e2e-postgres
API_CONTAINER=aecc-api
API_PORT=5080

up() {
  : "${AECC_API_IMAGE:?AECC_API_IMAGE em falta (imagem da API a testar)}"
  : "${E2E_SEED_PASSWORD:?E2E_SEED_PASSWORD em falta}"

  docker network create "$NETWORK" >/dev/null

  docker run -d --name "$DB_CONTAINER" --network "$NETWORK" \
    -e POSTGRES_DB=aecc_e2e -e POSTGRES_USER=aecc -e POSTGRES_PASSWORD=aecc_e2e \
    postgres:16-alpine >/dev/null

  echo "À espera do Postgres..."
  for _ in $(seq 1 30); do
    if docker exec "$DB_CONTAINER" pg_isready -q -U aecc -d aecc_e2e; then break; fi
    sleep 2
  done
  docker exec "$DB_CONTAINER" pg_isready -U aecc -d aecc_e2e

  # A API corre como appuser (uid 1001): HOME (certificados OpenIddict, DataProtection)
  # e uploads (storage local E2E) em tmpfs graváveis por esse uid.
  docker run -d --name "$API_CONTAINER" --network "$NETWORK" \
    -p "127.0.0.1:${API_PORT}:8080" \
    -e ASPNETCORE_ENVIRONMENT=E2E \
    -e HOME=/data/home \
    -e "ConnectionStrings__Postgres=Host=${DB_CONTAINER};Port=5432;Database=aecc_e2e;Username=aecc;Password=aecc_e2e" \
    --tmpfs /data/home:rw,uid=1001,gid=1001,mode=0700 \
    --tmpfs /data/uploads:rw,uid=1001,gid=1001,mode=0755 \
    "$AECC_API_IMAGE" >/dev/null
  docker inspect --format 'aecc-api: {{.Config.Image}} @ {{.Image}}' "$API_CONTAINER"

  # -fs (sem -S): as tentativas falhadas enquanto a API arranca não enchem o log.
  if ! curl -fs -o /dev/null \
         --retry 60 --retry-delay 2 --retry-all-errors --max-time 5 \
         "http://localhost:${API_PORT}/api/categories"; then
    echo "::error::A API não respondeu em http://localhost:${API_PORT}"
    docker logs "$API_CONTAINER" || true
    exit 1
  fi
  echo "API pronta."

  # -e sem valor: o docker herda E2E_SEED_PASSWORD do ambiente (não vai na linha de comando).
  docker exec -e E2E_SEED_PASSWORD "$API_CONTAINER" dotnet AECC.Api.dll seed-e2e
}

logs() {
  docker logs "$API_CONTAINER" || true
}

down() {
  docker rm -f "$API_CONTAINER" "$DB_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}

case "${1:-}" in
  up) up ;;
  logs) logs ;;
  down) down ;;
  *)
    echo "uso: $0 {up|logs|down}" >&2
    exit 2
    ;;
esac
