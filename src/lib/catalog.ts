import data from "../data/catalog.json";
import extendedData from "../data/extended-symbols.json";

export const CATEGORIES = [
  "Greek",
  "Operators",
  "Relations",
  "Arrows",
  "Sets & Logic",
  "Calculus",
  "Linear Algebra",
  "Probability",
  "Accents & Scripts",
  "Fonts",
  "Brackets",
  "Environments",
  "Text & Layout",
  "References",
  "Packages",
  "More Symbols",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type MathMode = "raw" | "inline" | "display";

export interface LatexEntry {
  id: string;
  title: string;
  latex: string;
  preview?: string;
  symbol: string;
  category: Category;
  keywords: string[];
  description: string;
  packages: string[];
  mode: "math" | "text" | "document";
  popular?: boolean;
  extended?: boolean;
  unicodePreview?: string;
}

const curated = data as LatexEntry[];
const curatedCommands = new Set(
  curated
    .filter((entry) => entry.mode === "math")
    .map((entry) => entry.latex.match(/^\\([A-Za-z]+)/)?.[1])
    .filter(Boolean),
);
export const catalog: LatexEntry[] = [
  ...curated,
  ...(extendedData as LatexEntry[]).filter((entry) => !curatedCommands.has(entry.latex.match(/^\\([A-Za-z]+)/)?.[1])),
];
export const byId = new Map(catalog.map((entry) => [entry.id, entry]));

export function formatLatex(entry: LatexEntry, mode: MathMode): string {
  if (entry.mode !== "math" || mode === "raw") return entry.latex;
  if (mode === "inline") return `$${entry.latex}$`;
  return `\\[\n${entry.latex}\n\\]`;
}

export function packageSnippet(entry: LatexEntry): string {
  return entry.packages.map((name) => `\\usepackage{${name}}`).join("\n");
}
