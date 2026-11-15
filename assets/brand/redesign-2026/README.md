# Marca AECC — redesenho 2026

Redesenho em vetor do logo da AECC (15/11/2026), feito a partir do `assets/brand/aecc-logo.webp` (239×100, com problemas de descodificação no Android). Substitui-o na Fase 3 do redesign.

- Texto: Source Sans 3, peso 500, convertido em contornos (o SVG não depende de fontes).
- Cores: navy `#134D6F`; símbolo `#D2302D` (vermelho), `#EDB12D` (dourado), `#2E8FC2` (azul), `#0E904F` (verde); texto da versão escura `#F5F3EE`.
- Versões monocromáticas com intervalos nos cruzamentos das faixas.
- Ícones com o traço 25% mais grosso, para tamanhos pequenos.

| Ficheiro | Uso |
| --- | --- |
| `aecc-logo-light.svg` / `@3x.png` | lockup completo, fundo claro |
| `aecc-logo-dark.svg` / `@3x.png` | lockup completo, fundo escuro |
| `aecc-symbol.svg` / `-1024.png` | só o símbolo, a cores |
| `aecc-symbol-mono-navy.svg`, `aecc-symbol-mono-white.svg` | símbolo numa só cor |
| `icon-white`, `icon-navy`, `icon-navy-deep`, `icon-navy-mono`, `icon-white-mono` (`.svg` + `-1024.png`) | opções de ícone da app (a escolher na Fase 3) |
| `android-adaptive-foreground`, `android-adaptive-monochrome` (`.svg` + `-1024.png`) | ícone adaptativo do Android (zona segura) e versão monocromática (temas do Android 13+) |
| `pwa-icon-512.png`, `pwa-icon-192.png`, `favicon-48.png` | provisórios, a partir do `icon-navy` |

Ainda não estão em uso no código. A escolha da variante do ícone e a integração (ícone, splash, ícones PWA, substituir o `.webp`) ficam para a Fase 3.
