# Third-party notices

The application code and original curated catalog are licensed under MIT (see LICENSE).

## Unicode-math symbol data

The supplemental symbol catalog in `src/data/extended-symbols.json` is a transformed
collection of factual symbol mappings from the unicode-math project. Its upstream
source is bundled unmodified as `scripts/vendor/unicode-math-table.tex`.

- Project: https://github.com/latex3/unicode-math
- Source: https://github.com/latex3/unicode-math/blob/master/unicode-math-table.tex
- Copyright 2006–2019 Will Robertson, 2010–2017 Philipp Stephani,
  2011–2017 Joseph Wright, 2012–2015 Khaled Hosny.
- License: LaTeX Project Public License 1.3c or later. Full license and copyright
  notices are included in `scripts/vendor/unicode-math-LICENSE` and
  `scripts/vendor/unicode-math-COPYRIGHT`.
- Modified work: `extended-symbols.json` and `scripts/import-symbols.mjs` are
  maintained by the LaTeX Palette contributors. They are not upstream unicode-math
  files. Changes include JSON conversion, English aliases, categories, compiler
  information, and merging base/AMS mappings. The derived data is distributed
  under LPPL 1.3c or later. Both the original source and regeneration script are
  included with this distribution.

## MathJax

Base and AMS symbol mappings, and mathematical preview rendering, use MathJax
3.2.2, Copyright The MathJax Consortium, licensed under Apache License 2.0.
The full license is included as `scripts/vendor/MathJax-LICENSE`.

Project: https://github.com/mathjax/MathJax-src

Preview PNGs are generated locally at build time. MathJax and Sharp are development
dependencies; the extension runtime has no rendering service or network dependency.
