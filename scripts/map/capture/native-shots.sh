#!/usr/bin/env bash
# Capturas nativas do mapa sem Maestro (docs/design/mapa-refino.md): só deep links, relançar a app e
# `xcrun simctl io … screenshot` / `adb exec-out screencap`. Pré-requisitos: app com sessão
# iniciada, Metro com EXPO_PUBLIC_API_URL → api-proxy.mjs e EXPO_PUBLIC_TILES_URL → cópia local.
# Uso: scripts/map/capture/native-shots.sh <ios|android> <prefixo> <saída-dir> <company-id> [query]
#   query: parâmetros extra do /map (ex.: dir=a), sem `?`.
set -euo pipefail
PLATFORM=$1 PREFIX=$2 OUT=$3 COMPANY=$4 EXTRA=${5:-}
mkdir -p "$OUT"
q() { local s="$EXTRA"; [ -n "$1" ] && s="${s:+$s&}$1"; echo "${s:+?$s}"; }

# shot <nome> [reuse]: "reuse" (Android) grava a hierarquia que o wait_id acabou de ler, do mesmo
# estado da captura (a OSM recolhe aos 5 s e um dump novo já a apanharia recolhida). No iOS o
# `maestro hierarchy` leva ≈ 17 s: o estado "OSM aberta" não tem hierarquia própria.
shot() {
  local name=$1 reuse=${2:-} tmp
  tmp=$(mktemp -t aecc-shot).png
  case "$PLATFORM" in
    ios) xcrun simctl io booted screenshot "$tmp" > /dev/null 2>&1 ;;
    android) adb exec-out screencap -p > "$tmp" ;;
  esac
  sips -s format jpeg -s formatOptions 78 "$tmp" --out "$OUT/$name.jpg" > /dev/null
  rm -f "$tmp"
  # Hierarquia no mesmo instante, para medir a área do mapa (native-area.mjs).
  if [ "$reuse" = reuse ]; then
    [ "$PLATFORM" = android ] && adb shell cat /sdcard/aecc-ui.xml > "$OUT/$name.xml" 2> /dev/null
    return 0
  fi
  case "$PLATFORM" in
    ios) maestro --device "$(xcrun simctl list devices booted | grep -m1 -oE '[0-9A-F-]{36}')" \
      hierarchy > "$OUT/$name.json" 2> /dev/null || true ;;
    android) adb shell uiautomator dump /sdcard/aecc-shot.xml > /dev/null 2>&1 || true
      adb shell cat /sdcard/aecc-shot.xml > "$OUT/$name.xml" 2> /dev/null || true ;;
  esac
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

# Relança a app (o estado da atribuição só volta a "aberta" num ecrã novo).
relaunch() {
  case "$PLATFORM" in
    ios) xcrun simctl terminate booted com.aecc.app > /dev/null 2>&1 || true
      xcrun simctl launch booted com.aecc.app > /dev/null ;;
    android) adb shell am force-stop com.aecc.app
      adb shell monkey -p com.aecc.app -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1 || true ;;
  esac
}

# Android: espera até todos os elementos (testID = resource-id) estarem no ecrã (debug: o tempo varia muito);
# iOS: OPEN_WAIT segundos.
wait_id() {
  if [ "$PLATFORM" != android ]; then sleep "${OPEN_WAIT:-4}"; return; fi
  for _ in $(seq 1 40); do
    adb shell uiautomator dump /sdcard/aecc-ui.xml > /dev/null 2>&1 || true
    local xml ok=1
    xml=$(adb shell cat /sdcard/aecc-ui.xml 2> /dev/null)
    for id in "$@"; do grep -q "resource-id=\"$id\"" <<< "$xml" || ok=0; done
    [ $ok = 1 ] && return
    sleep 1
  done
}

# OPEN_WAIT: segundos entre o deep link e a 1.ª captura (a OSM recolhe aos 5 s depois de o mapa
# montar); BOOT_WAIT: arranque da app (debug: o bundle vem do Metro).
for theme in light dark; do
  appearance "$theme"
  relaunch
  sleep "${BOOT_WAIT:-15}"
  open_link "$(q '')"
  wait_id map.view map.attribution.close
  shot "${PREFIX}__${PLATFORM}__${theme}__card-fechado" reuse
  sleep 7
  shot "${PREFIX}__${PLATFORM}__${theme}__atribuicao-recolhida"
  open_link "$(q "company=$COMPANY")"
  sleep 10
  shot "${PREFIX}__${PLATFORM}__${theme}__card-aberto"
done
appearance light
