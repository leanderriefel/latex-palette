import { catalog, type LatexEntry } from "./catalog";

// Expansion is deliberately one-hop: "arrow" should not gradually turn into all of mathematics.
const concepts: string[][] = [
  ["arrow", "arrows", "maps", "mapping", "implies", "implication", "direction", "harpoon"],
  ["equal", "equals", "equality", "equivalent", "equivalence", "congruent", "approximately"],
  ["less", "smaller", "lower", "below", "inequality"],
  ["greater", "bigger", "larger", "higher", "above", "inequality"],
  ["integral", "integrate", "integration", "antiderivative", "calculus"],
  ["derivative", "differentiate", "differentiation", "differential", "partial", "gradient", "calculus"],
  ["sum", "summation", "sigma", "series", "product"],
  ["set", "sets", "union", "intersection", "subset", "superset", "membership", "element"],
  ["logic", "logical", "forall", "exists", "quantifier", "proof", "therefore", "because"],
  ["matrix", "matrices", "array", "determinant", "vector", "linear algebra"],
  ["probability", "statistics", "statistical", "distribution", "expectation", "variance", "random"],
  ["fraction", "fractions", "divide", "division", "ratio", "quotient"],
  ["root", "roots", "sqrt", "radical", "square root", "cube root"],
  ["accent", "accents", "hat", "tilde", "overline", "underline", "dot", "vector"],
  ["bracket", "brackets", "parentheses", "parenthesis", "brace", "braces", "delimiter", "delimiters"],
  ["font", "fonts", "bold", "italic", "script", "calligraphic", "blackboard", "typeface"],
  ["align", "alignment", "equation", "equations", "multiline", "cases"],
  ["table", "tables", "tabular", "row", "column", "booktabs"],
  ["image", "images", "picture", "graphic", "graphics", "figure", "includegraphics"],
  ["reference", "references", "citation", "cite", "bibliography", "label", "cross reference"],
  ["package", "packages", "preamble", "usepackage", "extension", "extensions", "library"],
  ["spacing", "space", "spaces", "gap", "kern", "indent"],
  ["greek", "alpha", "beta", "gamma", "delta", "theta", "lambda", "omega"],
  ["chemistry", "chemical", "molecule", "molecular", "reaction", "reactions", "mhchem", "chemfig"],
  ["physics", "quantum", "bra", "ket", "braket", "dirac", "commutator", "anticommutator"],
  ["unit", "units", "measurement", "siunitx", "meter", "metre", "kilogram", "second", "quantity"],
  ["diagram", "diagrams", "drawing", "tikz", "tikzcd", "circuit", "plot", "graph", "pgfplots"],
  ["code", "programming", "source code", "listing", "listings", "minted", "verbatim"],
  ["color", "colour", "colored", "coloured", "xcolor", "highlight", "background"],
];

const stopWords = new Set([
  "a",
  "an",
  "the",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "is",
  "it",
  "that",
  "which",
  "me",
  "my",
  "please",
  "show",
  "find",
  "give",
  "symbol",
  "symbols",
  "command",
  "commands",
  "latex",
  "thing",
  "thingy",
  "looks",
  "like",
  "does",
  "do",
  "can",
  "want",
  "make",
  "get",
  "be",
  "than",
  "or",
  "pointing",
  "points",
  "point",
  "towards",
  "facing",
  "going",
]);

export function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\\/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function words(value: string): string[] {
  return normalize(value).split(" ").filter(Boolean);
}

function stem(value: string): string {
  if (value.length > 5 && value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.length > 4 && value.endsWith("s") && !value.endsWith("ss")) return value.slice(0, -1);
  return value;
}

// One edit (including an adjacent transposition) catches "intergal" without rewarding arbitrary substrings.
function nearWord(a: string, b: string): boolean {
  if (a.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  if (a.length === b.length) {
    return (
      a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
    );
  }
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  return shorter.slice(i) === longer.slice(i + 1);
}

interface IndexedEntry {
  entry: LatexEntry;
  title: string;
  keywords: string[];
  category: string;
  description: string;
  commands: string[];
  primary: Set<string>;
  secondary: Set<string>;
}

const index: IndexedEntry[] = catalog.map((entry) => ({
  entry,
  title: normalize(entry.title),
  keywords: entry.keywords.map(normalize),
  category: normalize(entry.category),
  description: normalize(entry.extended ? "" : entry.description),
  commands: Array.from(entry.latex.matchAll(/\\([A-Za-z]+)/g), (match) => match[1]),
  primary: new Set(words([entry.title, ...entry.keywords, ...entry.packages].join(" ")).map(stem)),
  secondary: new Set(words(`${entry.category} ${entry.extended ? "" : entry.description}`).map(stem)),
}));

export interface SearchResult {
  entry: LatexEntry;
  score: number;
  related: boolean;
}

export function searchCatalog(query: string): SearchResult[] {
  const raw = query.trim();
  if (!raw) return catalog.map((entry) => ({ entry, score: entry.popular ? 1 : 0, related: false }));
  const phrase = normalize(raw)
    .replace(/\b(left|right|up|down)wards?\b/g, "$1")
    .replace(/\barrow(?:\s+(?:pointing|points|towards|facing|going|to|the))*\s+(left|right|up|down)\b/g, "$1 arrow");
  const allWords = words(phrase);
  const terms = allWords.filter((term) => !stopWords.has(term));
  const queryWords = [...new Set((terms.length ? terms : allWords).map(stem))];
  const fragment = terms.length && terms.length < allWords.length ? terms.join(" ") : phrase;
  const typedCommand = raw.match(/^\\([A-Za-z]+)$/)?.[1];
  const expanded = new Set<string>();
  for (const group of concepts) {
    if (group.some((term) => queryWords.includes(stem(term)) || (term.includes(" ") && phrase.includes(term)))) {
      group
        .flatMap(words)
        .map(stem)
        .forEach((term) => expanded.add(term));
    }
  }
  queryWords.forEach((term) => expanded.delete(term));
  const found: SearchResult[] = [];
  for (const item of index) {
    const { entry } = item;
    let score = 0;
    let matched = 0;
    const exactSymbol = entry.symbol === raw || entry.latex === raw;
    if (exactSymbol) score += 1500;
    if (typedCommand && item.commands.includes(typedCommand)) score += 1100;
    if (phrase && item.title === phrase) score += 800;
    if (phrase && item.keywords.includes(phrase)) score += 650;
    if (fragment && item.title.includes(fragment)) score += 230;
    if (fragment && item.keywords.some((keyword) => keyword.includes(fragment))) score += 160;
    if (queryWords.length > 1 && queryWords.every((term) => words(item.title).map(stem).includes(term))) score += 220;
    for (const term of queryWords) {
      if (item.primary.has(term) || item.commands.some((command) => stem(command.toLowerCase()) === term)) {
        score += 90;
        matched++;
      } else if (term.length >= 2 && [...item.primary].some((word) => word.startsWith(term))) {
        score += 60;
        matched++;
      } else if (item.secondary.has(term)) {
        score += 30;
        matched++;
      } else if ([...item.primary].some((word) => nearWord(term, word))) {
        score += 42;
        matched++;
      }
    }
    const direct = exactSymbol || score >= 650 || (queryWords.length > 0 && matched === queryWords.length);
    const overlap = [...expanded].filter((term) => item.primary.has(term) || item.secondary.has(term)).length;
    if (!direct) {
      // Require a real shared concept or a substantial fraction of a longer English query.
      if (!overlap && (queryWords.length < 2 || matched / queryWords.length < 0.5)) continue;
      score = Math.min(150, score * 0.35) + Math.min(60, overlap * 12);
    } else {
      score += 300 + matched * 15;
    }
    if (!direct && score < 12) continue;
    score += entry.popular ? 90 : 0;
    score -= entry.extended ? 75 : 0;
    found.push({ entry, score, related: !direct });
  }
  return found.sort(
    (a, b) => Number(a.related) - Number(b.related) || b.score - a.score || a.entry.title.localeCompare(b.entry.title),
  );
}
