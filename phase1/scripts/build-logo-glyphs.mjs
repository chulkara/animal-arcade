// Extracts glyph outlines for the Noah's Arkade logotype so the logo ships as
// vector artwork (no runtime font dependency). Base faces: Abril Fatface and
// Cinzel (SIL OFL 1.1). Letterforms are then arranged/modified in NoahsArkadeLogo.tsx.
import fs from 'node:fs';
import opentype from 'opentype.js';
const fs_ = (p) => { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const abril = opentype.parse(fs_('node_modules/@fontsource/abril-fatface/files/abril-fatface-latin-400-normal.woff'));
const cinzel = opentype.parse(fs_('node_modules/@fontsource/cinzel/files/cinzel-latin-700-normal.woff'));
function glyphs(font, text, size) {
  return [...text].map((ch) => {
    const g = font.charToGlyph(ch);
    const p = g.getPath(0, 0, size);
    const bb = p.getBoundingBox();
    return { ch, d: p.toPathData(2), adv: +(g.advanceWidth * size / font.unitsPerEm).toFixed(2), x1: +bb.x1.toFixed(2), x2: +bb.x2.toFixed(2), y1: +bb.y1.toFixed(2), y2: +bb.y2.toFixed(2) };
  });
}
const out = { arkade: glyphs(abril, 'ARKADE', 200), noahs: glyphs(cinzel, "NOAH'S", 64) };
fs.writeFileSync('src/components/logo/glyphs.json', JSON.stringify(out));
console.log(out.arkade.map(g => g.ch + ':' + g.adv + ' [' + g.y1 + ',' + g.y2 + ']').join(' '));
console.log(out.noahs.map(g => g.ch + ':' + g.adv).join(' '));
