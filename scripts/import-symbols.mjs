// Rebuild the supplemental catalog from the bundled, unmodified upstream symbol table.
// No network access is needed. See THIRD_PARTY_NOTICES.md for source and licenses.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import prettier from "prettier";

const require = createRequire(import.meta.url);
require("mathjax-full/js/input/tex/base/BaseConfiguration.js");
require("mathjax-full/js/input/tex/ams/AmsConfiguration.js");
const { MapHandler } = require("mathjax-full/js/input/tex/MapHandler.js");
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = await readFile(join(root, "scripts/vendor/unicode-math-table.tex"), "utf8");
const records = [
  ...source.matchAll(/\\UnicodeMathSymbol\{"([0-9A-Fa-f]+)\}\{\\([A-Za-z]+)\s*\}\{\\([A-Za-z]+)\}\{([^}]*)\}/g),
].map(([, hex, command, type, label]) => ({ command, type, symbol: String.fromCodePoint(parseInt(hex, 16)), label }));
const byCommand = new Map(records.map((record) => [record.command, record]));
const bySymbol = new Map(records.map((record) => [record.symbol, record]));
const entries = new Map();

function cleanLabel(value) {
  return value
    .replace(/\/[A-Za-z]+/g, "")
    .replace(/\b[a-z]:/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[,\s-]+|[,\s-]+$/g, "");
}

function category(label, type, command) {
  const text = `${label} ${command}`.toLowerCase();
  if (/arrow|harpoon/.test(text)) return "Arrows";
  if (/integral|nabla|differential|partial/.test(text)) return "Calculus";
  if (/greek|alpha|beta|gamma|delta|theta|lambda|omega/.test(text)) return "Greek";
  if (/bold|italic|script|fraktur|double.struck|sans.serif|monospace/.test(text)) return "Fonts";
  if (/accent|over|under/.test(type)) return "Accents & Scripts";
  if (/mathopen|mathclose|mathfence/.test(type) || /bracket|brace|parenthes/.test(text)) return "Brackets";
  if (
    /subset|superset|union|intersection|element|logical|therefore|because|empty set|infinity|forall|exists/.test(text)
  )
    return "Sets & Logic";
  if (type === "mathrel") return "Relations";
  if (/mathbin|mathop/.test(type)) return "Operators";
  return "More Symbols";
}

function makeEntry(command, symbol, record, packages, extended) {
  const label = cleanLabel(record?.label ?? "") || command.replace(/([a-z])([A-Z])/g, "$1 $2");
  const type = record?.type ?? "mathord";
  const accent = /accent/.test(type);
  const latex = `\\${command}${accent ? "{x}" : ""}`;
  const keywords = new Set([label, command, ...packages]);
  if (/rightwards/.test(label)) keywords.add(label.replaceAll("rightwards", "right"));
  if (/leftwards/.test(label)) keywords.add(label.replaceAll("leftwards", "left"));
  if (/upwards/.test(label)) keywords.add(label.replaceAll("upwards", "up"));
  if (/downwards/.test(label)) keywords.add(label.replaceAll("downwards", "down"));
  if (/arrow/.test(label)) {
    keywords.add("direction pointing");
  }
  if (/harpoon/.test(label)) {
    keywords.add("half arrow");
  }
  if (/double.struck/.test(label)) keywords.add("blackboard bold");
  if (/script/.test(label)) keywords.add("calligraphic curly fancy letter");
  if (/fraktur/.test(label)) keywords.add("gothic old english letter");
  if (/bold/.test(label)) keywords.add("bold letter");
  if (/italic/.test(label)) keywords.add("italic letter");
  if (/integral/.test(label)) keywords.add("integration calculus");
  if (/summation/.test(label)) keywords.add("sum sigma series");
  if (/less.than/.test(label)) keywords.add("less smaller below");
  if (/greater.than/.test(label)) keywords.add("greater bigger larger above");
  const id = `symbol-${Buffer.from(command).toString("hex")}`;
  return {
    id,
    title: label.charAt(0).toUpperCase() + label.slice(1),
    latex,
    symbol,
    category: category(label, type, command),
    keywords: [...keywords],
    description: `${label.charAt(0).toUpperCase() + label.slice(1)}. ${extended ? "Provided by unicode-math; compile with LuaLaTeX or XeLaTeX and a supporting math font." : packages.length ? "Provided by the AMS symbol collection." : "A standard LaTeX math symbol."}`,
    packages,
    mode: "math",
    extended,
    ...(extended ? { unicodePreview: accent ? `x${symbol}` : symbol } : { preview: latex }),
  };
}

for (const name of [
  "mathchar0mi",
  "mathchar0mo",
  "mathchar7",
  "delimiter",
  "AMSmath-mathchar0mo",
  "AMSsymbols-mathchar0mi",
  "AMSsymbols-mathchar0mo",
  "AMSsymbols-delimiter",
]) {
  const map = MapHandler.getMap(name);
  for (const [key, value] of map?.map ?? []) {
    const command = key.replace(/^\\/, "");
    if (!/^[A-Za-z]+$/.test(command) || !value.char) continue;
    const packages = name.startsWith("AMSsymbols") ? ["amssymb"] : name.startsWith("AMSmath") ? ["amsmath"] : [];
    const record = byCommand.get(command) ?? bySymbol.get(value.char);
    entries.set(command, makeEntry(command, value.char, record, packages, false));
  }
}

for (const record of records) {
  if (!entries.has(record.command))
    entries.set(record.command, makeEntry(record.command, record.symbol, record, ["unicode-math"], true));
}

const output = [...entries.values()];
await writeFile(
  join(root, "src/data/extended-symbols.json"),
  await prettier.format(JSON.stringify(output), { parser: "json", printWidth: 120 }),
);
console.log(
  `Imported ${output.length} supplemental symbols (${output.filter((entry) => !entry.extended).length} base/AMS, ${output.filter((entry) => entry.extended).length} unicode-math).`,
);
