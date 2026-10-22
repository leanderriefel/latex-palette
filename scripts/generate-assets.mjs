import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { mathjax } = require("mathjax-full/js/mathjax.js");
const { TeX } = require("mathjax-full/js/input/tex.js");
const { SVG } = require("mathjax-full/js/output/svg.js");
const { liteAdaptor } = require("mathjax-full/js/adaptors/liteAdaptor.js");
const { RegisterHTMLHandler } = require("mathjax-full/js/handlers/html.js");
const { AllPackages } = require("mathjax-full/js/input/tex/AllPackages.js");
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalog = [
  ...JSON.parse(await readFile(join(root, "src/data/catalog.json"), "utf8")),
  ...JSON.parse(await readFile(join(root, "src/data/extended-symbols.json"), "utf8")),
];
const assets = join(root, "assets");
await mkdir(join(assets, "previews"), { recursive: true });

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const document = mathjax.document("", {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: "none" }),
});
const escape = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const failures = [];
const ids = new Set();
const cachePath = join(assets, "preview-manifest.json");
const previous = JSON.parse(await readFile(cachePath, "utf8").catch(() => "{}"));
const cache = {};
let generated = 0;

for (const entry of catalog) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || ids.has(entry.id))
    throw new Error(`Invalid or duplicate id: ${entry.id}`);
  ids.add(entry.id);
  for (const key of ["title", "latex", "symbol", "description", "category", "mode"]) {
    if (typeof entry[key] !== "string" || !entry[key]) throw new Error(`Missing ${key}: ${entry.id}`);
  }
  if (!Array.isArray(entry.keywords) || !Array.isArray(entry.packages))
    throw new Error(`Invalid metadata: ${entry.id}`);
  const hash = createHash("sha256")
    .update(
      `renderer-v3:${JSON.stringify([entry.id, entry.preview, entry.unicodePreview, entry.title, entry.latex, entry.symbol, entry.category, entry.mode])}`,
    )
    .digest("hex");
  const exists = await Promise.all(
    ["", "@dark"].map((suffix) =>
      access(join(assets, "previews", `${entry.id}${suffix}.png`)).then(
        () => true,
        () => false,
      ),
    ),
  );
  if (previous[entry.id] === hash && exists.every(Boolean)) {
    cache[entry.id] = hash;
    continue;
  }
  let formula;
  if (entry.preview) {
    try {
      formula = adaptor.innerHTML(document.convert(entry.preview, { display: true }));
      if (/data-mjx-error|merror/.test(formula)) throw new Error("MathJax rejected preview");
      const box = formula
        .match(/viewBox="([^\"]+)"/)?.[1]
        ?.split(/\s+/)
        .map(Number);
      if (!box || box[2] <= 0 || box[3] <= 0) formula = undefined;
      else {
        const scale = Math.min(410 / box[2], 190 / box[3]);
        formula = formula.replace(
          /^<svg\b([^>]*)>/,
          (_, attributes) =>
            `<svg${attributes.replace(/\s(?:width|height)="[^\"]*"/g, "")} width="${Math.max(1, Math.round(box[2] * scale))}" height="${Math.max(1, Math.round(box[3] * scale))}">`,
        );
      }
    } catch (error) {
      formula = undefined;
      failures.push({ id: entry.id, preview: entry.preview, error: String(error) });
    }
  }
  for (const [suffix, color, muted] of [
    ["", "#20262E", "#667085"],
    ["@dark", "#F1F0EC", "#A6ABB6"],
  ]) {
    let image;
    if (formula) {
      const svg = formula.replaceAll("currentColor", color);
      const buffer = await sharp(Buffer.from(svg), { density: 180 })
        .resize(410, 190, { fit: "inside" })
        .png()
        .toBuffer();
      image = await sharp({ create: { width: 480, height: 300, channels: 4, background: "#00000000" } })
        .composite([{ input: buffer, gravity: "center" }])
        .png()
        .toBuffer();
    } else if (entry.unicodePreview) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><text x="240" y="158" text-anchor="middle" dominant-baseline="central" fill="${color}" font-family="Cambria Math, STIX Two Math, Segoe UI Symbol, serif" font-size="180">${escape(entry.unicodePreview)}</text></svg>`;
      image = await sharp(Buffer.from(svg)).png().toBuffer();
    } else {
      const command =
        entry.latex.match(/^\\begin\{([^}]+)\}/)?.[1] ?? entry.latex.match(/^\\([a-zA-Z]+)/)?.[1] ?? entry.symbol;
      const label = entry.category === "Packages" ? entry.title.replace(/ package$/i, "") : command;
      const size = label.length > 18 ? 32 : label.length > 11 ? 40 : 54;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect x="100" y="35" width="280" height="230" rx="28" fill="${color}" fill-opacity=".035"/><text x="240" y="150" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-family="Consolas, monospace" font-size="${size}">${escape(label.slice(0, 26))}</text><text x="240" y="212" text-anchor="middle" fill="${muted}" font-family="Segoe UI, sans-serif" font-size="22">${escape(entry.category === "Packages" ? "PACKAGE" : entry.mode === "math" ? "MATH" : "TEMPLATE")}</text></svg>`;
      image = await sharp(Buffer.from(svg)).png().toBuffer();
    }
    await writeFile(join(assets, "previews", `${entry.id}${suffix}.png`), image);
    generated++;
  }
  cache[entry.id] = hash;
}

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#9C80FF"/><stop offset="1" stop-color="#5740BD"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><rect x="28" y="28" width="456" height="456" rx="88" fill="none" stroke="white" stroke-opacity=".2" stroke-width="2"/><path d="M340 121H159v19l96 111-96 119v21h190l13-75h-18l-22 45H207l89-109-89-104h111l18 39h18z" fill="#FFFDF6"/><circle cx="385" cy="116" r="14" fill="#D6FF9C"/></svg>`;
await sharp(Buffer.from(icon)).png().toFile(join(assets, "icon.png"));
await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
console.log(`Generated ${generated} themed previews (${catalog.length * 2} total) and a 512px extension icon.`);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
