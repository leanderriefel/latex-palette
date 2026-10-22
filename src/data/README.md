# Curated LaTeX catalog

`catalog.json` contains 745 hand-curated entries across 15 categories. It is bundled with the extension and needs no network connection. Symbols, commands, and complete templates are distinct entries: **Integral** inserts `\int`, while **Integral template** inserts an example integrand and differential.

Each entry has a stable kebab-case `id`, an English `title`, pasteable `latex`, a short Unicode `symbol`, a `category`, English search `keywords`, a brief `description`, a list of required `packages`, and an insertion `mode`. An optional `preview` is MathJax-compatible TeX without math delimiters. A preview may use equivalent portable TeX when the inserted command belongs to a package MathJax does not implement. An optional `popular` flag identifies common choices.

Use `math` for snippets to insert inside math mode, `text` for document-body snippets, and `document` for preamble declarations or complete environments that provide their own math context. Only math snippets should receive user-selected math wrappers. Package imports use the core `\usepackage` command and therefore have an empty prerequisite list. `amsfonts` requirements are also satisfied by `amssymb`; `amsmath` requirements are also satisfied by `mathtools`. An empty package list does not mean a snippet can be used outside its documented context.

Templates use editable ordinary values such as `x`, `Title`, `key`, and `example-image`. Image, code, PDF, and bibliography examples expect the referenced file to exist. Labels and citation keys must match the destination document. Theorems need an appropriate declaration; chapters need a supporting document class. `minted` additionally needs its documented highlighting toolchain. The `physics` and `siunitx` packages both define a command named `\qty`; choose the appropriate package convention in the destination document.

The catalog was checked for JSON/schema validity, duplicate IDs, duplicate insertion strings, and balanced environment nesting. This is a curated practical collection; it does not claim to enumerate every command in every CTAN package. The separately maintained extended symbol corpus complements it.

## Primary references

Package names, syntax, and prerequisites were checked against these maintained package pages and their linked manuals. Descriptions and search aliases are original catalog text.

- [AMS math and its bundled support](https://ctan.org/pkg/amsmath)
- [AMS symbols](https://ctan.org/pkg/amssymb) and [AMS fonts](https://ctan.org/pkg/amsfonts)
- [mathtools manual](https://ctan.net/macros/latex/contrib/mathtools/mathtools.pdf)
- [siunitx and manual](https://ctan.org/pkg/siunitx)
- [braket](https://ctan.org/pkg/braket) and [physics](https://ctan.org/pkg/physics)
- [mhchem](https://ctan.org/pkg/mhchem) and [chemfig](https://ctan.org/pkg/chemfig)
- [PGFPlots](https://ctan.org/pkg/pgfplots), [minted](https://ctan.org/pkg/minted), and [fancyhdr](https://ctan.org/pkg/fancyhdr)
- [tikz-cd](https://ctan.org/pkg/tikz-cd), [CircuiTikZ](https://circuitikz.github.io/), and [tcolorbox](https://ctan.org/pkg/tcolorbox)
- [fontspec](https://ctan.org/pkg/fontspec) and [unicode-math](https://ctan.org/pkg/unicode-math)
