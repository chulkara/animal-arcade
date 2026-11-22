// Assembles the approved menu painting from the repository's committed base64
// fragments (../assets/approved-menu-png) into public/art/approved-menu.png.
// Bytes are decoded exactly (never re-encoded) and checked against the approved SHA-256.
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'assets', 'approved-menu-png');
const out = join(here, '..', 'public', 'art', 'approved-menu.png');
const SHA = '90fffe36338fc7c939c5e41c62a656a83532f0c1e3254b05cefd6bb9249fc9f4';

if (existsSync(out) && createHash('sha256').update(readFileSync(out)).digest('hex') === SHA) {
  console.log('approved menu art present and verified');
  process.exit(0);
}
const b64 = Array.from({ length: 20 }, (_, i) => readFileSync(join(src, `part-${String(i).padStart(2, '0')}.txt`), 'utf8')).join('');
const raw = Buffer.from(b64, 'base64');
const digest = createHash('sha256').update(raw).digest('hex');
if (raw.length !== 3170023 || digest !== SHA) throw new Error(`Approved menu art integrity failure (${raw.length} bytes, ${digest})`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, raw);
console.log('approved menu art written:', raw.length, 'bytes, sha256', digest);
