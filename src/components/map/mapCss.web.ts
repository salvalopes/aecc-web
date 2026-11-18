// Regras de layout de que o maplibre-gl 5 precisa (subconjunto de maplibre-gl/dist/maplibre-gl.css,
// BSD-3-Clause), injetadas pelo chunk do mapa. Não se importa o .css do pacote porque o Metro web o
// promove a uma folha global no index.html (≈ 10 KB gzip em todas as rotas; regra 4). Não usamos
// controlos, popups nem marcadores do MapLibre, por isso o resto da folha não faz falta.
const CSS = [
  '.maplibregl-map{overflow:hidden;position:relative;-webkit-tap-highlight-color:transparent}',
  '.maplibregl-canvas{position:absolute;inset:0 auto auto 0}',
  '.maplibregl-canvas-container.maplibregl-interactive{cursor:grab;user-select:none}',
  '.maplibregl-canvas-container.maplibregl-interactive:active{cursor:grabbing}',
  '.maplibregl-canvas-container.maplibregl-touch-zoom-rotate,' +
    '.maplibregl-canvas-container.maplibregl-touch-zoom-rotate .maplibregl-canvas{touch-action:pan-x pan-y}',
  '.maplibregl-canvas-container.maplibregl-touch-drag-pan,' +
    '.maplibregl-canvas-container.maplibregl-touch-drag-pan .maplibregl-canvas{touch-action:pinch-zoom}',
  '.maplibregl-canvas-container.maplibregl-touch-zoom-rotate.maplibregl-touch-drag-pan,' +
    '.maplibregl-canvas-container.maplibregl-touch-zoom-rotate.maplibregl-touch-drag-pan .maplibregl-canvas{touch-action:none}',
].join('\n');

let injected = false;

export function ensureMapCss(): void {
  if (injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.setAttribute('data-aecc', 'maplibre-gl');
  style.textContent = CSS;
  document.head.appendChild(style);
  injected = true;
}
