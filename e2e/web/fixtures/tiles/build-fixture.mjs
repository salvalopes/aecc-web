// Fixture de tiles para os E2E do mapa (mapa-plano W2/W3): os testes não dependem do servidor de
// produção nem da T1. Gera, só com módulos nativos do Node:
//   cascais.pmtiles          PMTiles v3 com 1 tile MVT z0 (camadas `earth` e `water`), sem compressão
//   fonts/glyphs.pbf         PBF de glyphs válido mas vazio (o serve-static serve-o para qualquer stack/range)
//   sprites/v4/{light,dark}{,@2x}.{json,png}   sprite vazio ({} + PNG 1×1 transparente)
// Uso: node e2e/web/fixtures/tiles/build-fixture.mjs   (os ficheiros gerados são versionados)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const out = dirname(fileURLToPath(import.meta.url));

// ── protobuf mínimo ──────────────────────────────────────────────────────────
function varint(n) {
  const bytes = [];
  let v = BigInt(n);
  do {
    let b = Number(v & 0x7fn);
    v >>= 7n;
    if (v > 0n) b |= 0x80;
    bytes.push(b);
  } while (v > 0n);
  return Buffer.from(bytes);
}
const key = (field, wire) => varint((field << 3) | wire);
const lenField = (field, buf) => Buffer.concat([key(field, 2), varint(buf.length), buf]);
const strField = (field, s) => lenField(field, Buffer.from(s, 'utf8'));
const intField = (field, n) => Buffer.concat([key(field, 0), varint(n)]);
const packed = (field, nums) => lenField(field, Buffer.concat(nums.map(varint)));
const zigzag = (n) => (n << 1) ^ (n >> 31);

// ── MVT: polígono retangular (anel exterior no sentido dos ponteiros em y-para-baixo) ──
function rectGeometry(x0, y0, x1, y1) {
  const pts = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  const cmds = [(1 & 7) | (1 << 3), zigzag(pts[0][0]), zigzag(pts[0][1])];
  cmds.push((2 & 7) | (3 << 3));
  for (let i = 1; i < pts.length; i++) {
    cmds.push(zigzag(pts[i][0] - pts[i - 1][0]), zigzag(pts[i][1] - pts[i - 1][1]));
  }
  cmds.push((7 & 7) | (1 << 3));
  return cmds;
}
function layer(name, geometry) {
  const feature = Buffer.concat([intField(1, 1), intField(3, 3), packed(4, geometry)]);
  return lenField(
    3,
    Buffer.concat([intField(15, 2), strField(1, name), lenField(2, feature), intField(5, 4096)]),
  );
}
// z0: x = (lng + 180) / 360 * 4096. A "água" é tudo a oeste de −9,45° (o Atlântico ao largo de Cascais).
const coastX = Math.round(((-9.45 + 180) / 360) * 4096);
const tile = Buffer.concat([
  layer('earth', rectGeometry(0, 0, 4096, 4096)),
  layer('water', rectGeometry(0, 0, coastX, 4096)),
]);

// ── PMTiles v3 ───────────────────────────────────────────────────────────────
const metadata = Buffer.from(
  JSON.stringify({
    name: 'aecc-e2e-fixture',
    attribution: 'fixture E2E (sem dados OSM)',
    vector_layers: [
      { id: 'earth', fields: {} },
      { id: 'water', fields: {} },
    ],
  }),
);
// 1 entrada: tileId 0 (z0/0/0), runLength 1, length, offset 0 (escrito como offset + 1).
const rootDir = Buffer.concat([varint(1), varint(0), varint(1), varint(tile.length), varint(1)]);
const HEADER = 127;
const header = Buffer.alloc(HEADER);
header.write('PMTiles', 0, 'ascii');
header.writeUInt8(3, 7);
const rootOff = HEADER;
const metaOff = rootOff + rootDir.length;
const dataOff = metaOff + metadata.length;
header.writeBigUInt64LE(BigInt(rootOff), 8);
header.writeBigUInt64LE(BigInt(rootDir.length), 16);
header.writeBigUInt64LE(BigInt(metaOff), 24);
header.writeBigUInt64LE(BigInt(metadata.length), 32);
header.writeBigUInt64LE(BigInt(dataOff + tile.length), 40); // sem leaf directories
header.writeBigUInt64LE(0n, 48);
header.writeBigUInt64LE(BigInt(dataOff), 56);
header.writeBigUInt64LE(BigInt(tile.length), 64);
header.writeBigUInt64LE(1n, 72); // addressed tiles
header.writeBigUInt64LE(1n, 80); // tile entries
header.writeBigUInt64LE(1n, 88); // tile contents
header.writeUInt8(1, 96); // clustered
header.writeUInt8(1, 97); // internal compression: none
header.writeUInt8(1, 98); // tile compression: none
header.writeUInt8(1, 99); // tile type: mvt
header.writeUInt8(0, 100); // min zoom
header.writeUInt8(0, 101); // max zoom (o MapLibre faz overzoom)
const e7 = (deg) => Math.round(deg * 1e7);
header.writeInt32LE(e7(-180), 102);
header.writeInt32LE(e7(-85), 106);
header.writeInt32LE(e7(180), 110);
header.writeInt32LE(e7(85), 114);
header.writeUInt8(0, 118);
header.writeInt32LE(e7(-9.31), 119);
header.writeInt32LE(e7(38.74), 123);
const pmtiles = Buffer.concat([header, rootDir, metadata, tile]);

// ── glyphs: fontstack sem glyphs ─────────────────────────────────────────────
const glyphs = lenField(1, Buffer.concat([strField(1, 'fixture'), strField(2, '0-255')]));

// ── PNG 1×1 transparente ─────────────────────────────────────────────────────
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(1, 0);
ihdr.writeUInt32BE(1, 4);
ihdr.writeUInt8(8, 8); // bit depth
ihdr.writeUInt8(6, 9); // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0, 0]))),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync(join(out, 'fonts'), { recursive: true });
mkdirSync(join(out, 'sprites', 'v4'), { recursive: true });
writeFileSync(join(out, 'cascais.pmtiles'), pmtiles);
writeFileSync(join(out, 'fonts', 'glyphs.pbf'), glyphs);
for (const scheme of ['light', 'dark']) {
  for (const suffix of ['', '@2x']) {
    writeFileSync(join(out, 'sprites', 'v4', `${scheme}${suffix}.json`), '{}\n');
    writeFileSync(join(out, 'sprites', 'v4', `${scheme}${suffix}.png`), png);
  }
}
console.log(`cascais.pmtiles: ${pmtiles.length} B; glyphs.pbf: ${glyphs.length} B; png: ${png.length} B`);
