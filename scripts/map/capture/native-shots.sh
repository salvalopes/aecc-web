#!/usr/bin/env bash
# Capturas nativas do mapa sem Maestro (docs/design/mapa-refino.md): só deep links e
# `xcrun simctl io … screenshot` / `adb exec-out screencap`. Pré-requisitos: app com sessão
# iniciada, Metro com EXPO_PUBLIC_API_URL → api-proxy.mjs e EXPO_PUBLIC_TILES_URL → cópia local.
# Uso: scripts/map/capture/native-shots.sh <ios|android> <prefixo> <saída-dir> <company-id> [query]
#   query: parâmetros extra do /map (ex.: dir=a), sem `?`.
set -euo pipefail
PLATFORM=$1 PREFIX=$2 OUT=$3 COMPANY=$4 EXTRA=${5:-}
mkdir -p "$OUT"
q() { local s="$EXTRA"; [ -n "$1" ] && s="${s:+$s&}$1"; echo "${s:+?$s}"; }

shot() {
  local name=$1 tmp
  tmp=$(mktemp -t aecc-shot).png
  case "$PLATFORM" in
    ios) xcrun simctl io booted screenshot "$tmp" > /dev/null 2>&1 ;;
    android) adb exec-out screencap -p > "$tmp" ;;
  esac
  sips -s format jpeg -s formatOptions 78 "$tmp" --out "$OUT/$name.jpg" > /dev/null
  rm -f "$tmp"
}
open_link() {
  case "$PLATFORM" in
    ios) xcrun simctl openurl booted "aecc://map$1" ;;
    android) adb shell am start -W -a android.intent.action.VIEW -d "aecc://map$1" com.aecc.app > /dev/null ;;
  esac
}
appearance() {
  case "$PLATFORM" in
    ios) xcrun simctl ui booted appearance "$1" ;;
    android) adb shell cmd uimode night "$([ "$1" = dark ] && echo yes || echo no)" > /dev/null ;;
  esac
}

for theme in light dark; do
  appearance "$theme"
  sleep 3
  open_link "$(q '')"
  sleep 10
  shot "${PREFIX}__${PLATFORM}__${theme}__card-fechado"
  open_link "$(q "company=$COMPANY")"
  sleep 10
  shot "${PREFIX}__${PLATFORM}__${theme}__card-aberto"
done
appearance light
