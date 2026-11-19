#!/usr/bin/env bash
# Tamanho do bundle web (regra 5: MapLibre lazy). Uso: bundle-size.sh <saída-dir> [ENV=valor ...]
# Exporta a web e imprime o JS inicial (scripts do index.html) e os chunks do mapa, em bytes
# e gzip. Sem argumentos extra = build de produção (sem EXPO_PUBLIC_MAP_PROTOTYPE).
set -euo pipefail
OUT=$1
shift
env "$@" EXPO_PUBLIC_API_URL=https://aecc.salv4.com/api npx expo export -p web --clear --output-dir "$OUT" > /dev/null 2>&1
cd "$OUT"
size() { printf '%9d %8d  %s\n' "$(wc -c < "$1")" "$(gzip -9c "$1" | wc -c)" "$1"; }
echo "    bytes     gzip  ficheiro"
initial=$(grep -oE '<script src="[^"]+"' index.html | sed -E 's/<script src="\/?([^"]+)"/\1/')
for f in $initial; do size "$f"; done
echo "-- chunks do mapa"
for f in $(ls _expo/static/js/web/ | grep -E '^(MapScreen|CompanyMap|MapPrototype)'); do size "_expo/static/js/web/$f"; done
echo "-- marcador do protótipo no build: $(grep -l 'zone-fill' -r _expo/static/js/web | wc -l | tr -d ' ') ficheiro(s)"
