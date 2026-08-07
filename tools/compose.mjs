#!/usr/bin/env node
/**
 * compose - the brand layer.
 *
 * The generator renders the SCENE ONLY. No text is ever put in an image prompt.
 * Everything typographic - headline, subhead, bullets, logo, footer lockup,
 * slide counter, CTA bar - is composited here, locally, with the operator's
 * real fonts.
 *
 * Why this split is load-bearing:
 *
 *   1. Text rendered by an image model cannot be corrected. A typo is baked
 *      into the pixels and the only fix is regenerating the whole asset, which
 *      returns a different picture. Composited text is a one-line edit.
 *   2. Brand consistency stops depending on the model's whim. The mark is the
 *      real mark, the font is the real font, the accent is the real hex.
 *   3. One generated scene exports to every aspect ratio without generating
 *      anything twice.
 *
 * Side effect worth knowing: the output is a genuinely new composite, so the
 * generator's C2PA and IPTC provenance metadata does not survive re-encoding.
 * That is not a guarantee of anything. Platform-side classifiers and invisible
 * watermarks are untouched and may still label the post.
 *
 *   node tools/compose.mjs spec.json
 *   node tools/compose.mjs spec.json --out ./build
 *   cat spec.json | node tools/compose.mjs -
 */

import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

// ---------------------------------------------------------------------------
// Formats
// ---------------------------------------------------------------------------

const FORMATS = {
  '1:1':  { w: 1080, h: 1080 },
  '4:5':  { w: 1080, h: 1350 },
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
};

// ---------------------------------------------------------------------------
// Text helpers
//
// SVG does not wrap. Wrapping is ours to do, from an estimated advance width.
// `widthFactor` is per-typeface and lives in the spec; heavy condensed faces run
// nearer 0.46, humanist sans nearer 0.54.
// ---------------------------------------------------------------------------

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function wrap(text, fontSize, maxWidth, widthFactor = 0.52) {
  const per = fontSize * widthFactor;
  const max = Math.max(1, Math.floor(maxWidth / per));
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length <= max) { line = candidate; continue; }
      if (line) out.push(line);
      line = word;
    }
    out.push(line);
  }
  return out;
}

/**
 * Headline with per-word accent colouring.
 * `accentWords` is a list of words that flip to the accent colour, which is the
 * convention the shipped templates use: whole line in the base colour, one word
 * carrying the emphasis.
 */
function headlineSvg({ text, x, y, fontSize, lineHeight, font, weight, colour,
                       accent, accentWords = [], maxWidth, widthFactor, anchor = 'start',
                       letterSpacing = 0, transform }) {
  const value = transform === 'uppercase' ? String(text).toUpperCase() : String(text);
  const wanted = new Set(accentWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/gi, '')));
  const lines = wrap(value, fontSize, maxWidth, widthFactor);

  return lines.map((line, i) => {
    const spans = line.split(/(\s+)/).map(tok => {
      if (!tok.trim()) return esc(tok);
      const key = tok.toLowerCase().replace(/[^a-z0-9]/gi, '');
      const fill = wanted.has(key) ? accent : colour;
      return `<tspan fill="${fill}">${esc(tok)}</tspan>`;
    }).join('');

    return `<text x="${x}" y="${y + i * fontSize * lineHeight}" `
         + `font-family="${esc(font)}" font-size="${fontSize}" font-weight="${weight}" `
         + `letter-spacing="${letterSpacing}" text-anchor="${anchor}" `
         + `fill="${colour}">${spans}</text>`;
  }).join('\n');
}

function paragraphSvg({ text, x, y, fontSize, lineHeight, font, weight, colour,
                        maxWidth, widthFactor, anchor = 'start' }) {
  return wrap(text, fontSize, maxWidth, widthFactor).map((line, i) =>
    `<text x="${x}" y="${y + i * fontSize * lineHeight}" font-family="${esc(font)}" `
  + `font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}" `
  + `fill="${colour}">${esc(line)}</text>`).join('\n');
}

// ---------------------------------------------------------------------------
// Font embedding
//
// System font lookup is not portable across a stranger's machine, a CI runner
// and a cloud clone. When the binding points at real font files we inline them
// as base64 so the render is identical everywhere.
// ---------------------------------------------------------------------------

function fontFaces(fonts = {}) {
  return Object.entries(fonts).map(([family, def]) => {
    const file = typeof def === 'string' ? def : def.file;
    if (!file || !existsSync(file)) return '';
    const mime = extname(file).toLowerCase() === '.otf' ? 'font/otf'
               : extname(file).toLowerCase() === '.ttf' ? 'font/ttf' : 'font/woff2';
    const b64 = readFileSync(file).toString('base64');
    const weight = typeof def === 'object' && def.weight ? def.weight : 'normal';
    return `@font-face{font-family:'${family}';font-weight:${weight};`
         + `src:url(data:${mime};base64,${b64});}`;
  }).join('\n');
}

// ---------------------------------------------------------------------------
// Layer builders
// ---------------------------------------------------------------------------

function scrimSvg(scrim, W, H) {
  if (!scrim) return '';
  const { from = 'rgba(0,0,0,0.75)', to = 'rgba(0,0,0,0)', direction = 'top' } = scrim;
  const coords = direction === 'top'    ? 'x1="0" y1="0" x2="0" y2="1"'
               : direction === 'bottom' ? 'x1="0" y1="1" x2="0" y2="0"'
               : 'x1="0" y1="0" x2="1" y2="0"';
  return `<defs><linearGradient id="scrim" ${coords}>
      <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#scrim)"/>`;
}

function bulletsSvg(items, opt) {
  const { x, y, fontSize, lineHeight, gap, font, colour, accent, maxWidth, widthFactor } = opt;
  let cursor = y;
  const parts = [];
  for (const item of items) {
    const lines = wrap(item, fontSize, maxWidth - fontSize * 1.9, widthFactor);
    const box = fontSize * 0.82;
    parts.push(
      `<rect x="${x}" y="${cursor - box * 0.86}" width="${box}" height="${box}" `
    + `rx="${box * 0.18}" fill="${accent}"/>`);
    lines.forEach((line, i) => parts.push(
      `<text x="${x + fontSize * 1.9}" y="${cursor + i * fontSize * lineHeight}" `
    + `font-family="${esc(font)}" font-size="${fontSize}" fill="${colour}">${esc(line)}</text>`));
    cursor += lines.length * fontSize * lineHeight + gap;
  }
  return parts.join('\n');
}

function footerSvg(footer, W, H, spec) {
  if (!footer) return '';
  const { left = '', right = '', fontSize = 26, colour = spec.colours.muted } = footer;
  const pad = spec.layout.padding;
  const y = H - pad * 0.6;
  const bits = [];
  if (left)  bits.push(`<text x="${pad}" y="${y}" font-family="${esc(spec.fonts.body.family)}" `
                     + `font-size="${fontSize}" fill="${colour}" letter-spacing="2">${esc(left)}</text>`);
  if (right) bits.push(`<text x="${W - pad}" y="${y}" font-family="${esc(spec.fonts.body.family)}" `
                     + `font-size="${fontSize}" fill="${colour}" text-anchor="end">${esc(right)}</text>`);
  return bits.join('\n');
}

function counterSvg(counter, spec) {
  if (!counter) return '';
  const pad = spec.layout.padding;
  return `<text x="${pad}" y="${pad}" font-family="${esc(spec.fonts.body.family)}" `
       + `font-size="30" fill="${spec.colours.muted}" letter-spacing="3">`
       + `<tspan fill="${spec.colours.accent}">${esc(counter.index)}</tspan>`
       + ` / ${esc(counter.total)}</text>`;
}

function ctaSvg(cta, W, H, spec) {
  if (!cta) return '';
  const pad = spec.layout.padding;
  const h = 88, w = W - pad * 2, y = H - pad - h - 40;
  return `<rect x="${pad}" y="${y}" width="${w}" height="${h}" rx="12" fill="${spec.colours.accent}"/>
    <text x="${W / 2}" y="${y + h * 0.64}" font-family="${esc(spec.fonts.headline.family)}" `
    + `font-size="36" font-weight="700" text-anchor="middle" fill="${spec.colours.ctaText ?? '#ffffff'}">`
    + `${esc(String(cta.label).toUpperCase())}</text>`;
}

// ---------------------------------------------------------------------------
// Render one format
// ---------------------------------------------------------------------------

async function renderFormat(spec, format, outDir) {
  const { w: W, h: H } = FORMATS[format] ?? FORMATS['1:1'];
  const pad = spec.layout.padding;
  const maxWidth = W - pad * 2;
  const hf = spec.fonts.headline, bf = spec.fonts.body;

  // ---- base: generated scene, or a flat/gradient ground when there is none.
  let base;
  if (spec.scene && existsSync(spec.scene)) {
    base = sharp(spec.scene).resize(W, H, { fit: 'cover', position: 'attention' });
  } else {
    base = sharp({
      create: { width: W, height: H, channels: 4,
                background: spec.colours.background ?? '#0d0d0f' },
    });
  }

  // ---- typographic layer
  const layers = [];
  layers.push(scrimSvg(spec.scrim, W, H));

  let cursor = spec.layout.headlineTop ?? Math.round(H * 0.18);

  if (spec.headline) {
    const size = spec.layout.headlineSize ?? Math.round(W * 0.095);
    layers.push(headlineSvg({
      text: spec.headline, x: pad, y: cursor,
      fontSize: size, lineHeight: spec.layout.headlineLeading ?? 1.06,
      font: hf.family, weight: hf.weight ?? 800,
      colour: spec.colours.text, accent: spec.colours.accent,
      accentWords: spec.accentWords ?? [],
      maxWidth, widthFactor: hf.widthFactor ?? 0.5,
      letterSpacing: spec.layout.headlineTracking ?? -1,
      transform: spec.layout.headlineCase,
    }));
    const lines = wrap(spec.headline, size, maxWidth, hf.widthFactor ?? 0.5).length;
    cursor += lines * size * (spec.layout.headlineLeading ?? 1.06) + size * 0.5;
  }

  if (spec.subhead) {
    const size = spec.layout.subheadSize ?? Math.round(W * 0.038);
    layers.push(paragraphSvg({
      text: spec.subhead, x: pad, y: cursor, fontSize: size, lineHeight: 1.35,
      font: bf.family, weight: bf.weight ?? 400,
      colour: spec.colours.muted, maxWidth, widthFactor: bf.widthFactor ?? 0.54,
    }));
    cursor += wrap(spec.subhead, size, maxWidth, bf.widthFactor ?? 0.54).length * size * 1.35 + size;
  }

  if (spec.bullets?.length) {
    layers.push(bulletsSvg(spec.bullets, {
      x: pad, y: cursor + 20,
      fontSize: spec.layout.bulletSize ?? Math.round(W * 0.036),
      lineHeight: 1.3, gap: (spec.layout.bulletSize ?? W * 0.036) * 0.75,
      font: bf.family, colour: spec.colours.text, accent: spec.colours.accent,
      maxWidth: spec.layout.bulletWidth ?? maxWidth * 0.62,
      widthFactor: bf.widthFactor ?? 0.54,
    }));
  }

  layers.push(counterSvg(spec.counter, spec));
  layers.push(ctaSvg(spec.cta, W, H, spec));
  layers.push(footerSvg(spec.footer, W, H, spec));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <style>${fontFaces(spec.fontFiles)}</style>
    ${layers.filter(Boolean).join('\n')}
  </svg>`;

  const composites = [{ input: Buffer.from(svg), top: 0, left: 0 }];

  // ---- logo, placed by keyword
  if (spec.logo?.file && existsSync(spec.logo.file)) {
    const lw = Math.round(W * (spec.logo.scale ?? 0.17));
    const logo = await sharp(spec.logo.file).resize({ width: lw }).toBuffer();
    const meta = await sharp(logo).metadata();
    const pos = spec.logo.position ?? 'top-left';
    const top  = pos.startsWith('bottom') ? H - pad - meta.height : pad;
    const left = pos.endsWith('right')  ? W - pad - lw
               : pos.endsWith('centre') || pos.endsWith('center') ? Math.round((W - lw) / 2)
               : pad;
    composites.push({ input: logo, top, left });
  }

  mkdirSync(outDir, { recursive: true });
  const name = `${spec.slug ?? 'asset'}-${format.replace(':', 'x')}.png`;
  const outPath = join(outDir, name);

  // No withMetadata(): the composite carries no inherited provenance chain.
  await base.composite(composites).png({ compressionLevel: 9 }).toFile(outPath);

  return outPath;
}

// ---------------------------------------------------------------------------

function withDefaults(spec) {
  return {
    layout: { padding: 84, ...spec.layout },
    colours: {
      text: '#ffffff', muted: '#9aa0a6', accent: '#ff5a1f',
      background: '#0d0d0f', ...spec.colours,
    },
    fonts: {
      headline: { family: 'Inter', weight: 800, widthFactor: 0.5 },
      body:     { family: 'Inter', weight: 400, widthFactor: 0.54 },
      ...spec.fonts,
    },
    ...spec,
    // re-apply merged children so a partial spec cannot clobber them
    ...{
      layout: { padding: 84, ...spec.layout },
      colours: { text: '#ffffff', muted: '#9aa0a6', accent: '#ff5a1f',
                 background: '#0d0d0f', ...spec.colours },
      fonts: {
        // conservative width factors: with no embedded font files the renderer
        // falls back to a system face that runs wider than Inter; clipping is
        // worse than an early wrap. Embedded brand fonts can tune these down.
        headline: { family: 'Inter', weight: 800, widthFactor: 0.62, ...spec.fonts?.headline },
        body:     { family: 'Inter', weight: 400, widthFactor: 0.6, ...spec.fonts?.body },
      },
    },
  };
}

export async function compose(rawSpec, outDir = 'build') {
  const spec = withDefaults(rawSpec);
  const formats = spec.formats?.length ? spec.formats : ['1:1'];
  const written = [];
  for (const f of formats) written.push(await renderFormat(spec, f, outDir));
  return written;
}

// ---------------------------------------------------------------------------

const isMain = process.argv[1] && basename(process.argv[1]) === 'compose.mjs';
if (isMain) {
  const args = process.argv.slice(2);
  const specArg = args.find(a => !a.startsWith('--')) ?? '-';
  const outIdx = args.indexOf('--out');
  const outDir = outIdx > -1 ? args[outIdx + 1] : 'build';

  const raw = specArg === '-'
    ? readFileSync(0, 'utf8')
    : readFileSync(specArg, 'utf8');

  const written = await compose(JSON.parse(raw), outDir);
  for (const p of written) console.log(p);
}
