<h1 align="center">OCC</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@cesarandreslopez/occ"><img src="https://img.shields.io/npm/v/@cesarandreslopez/occ?label=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@cesarandreslopez/occ"><img src="https://img.shields.io/npm/dt/@cesarandreslopez/occ?label=npm%20Downloads" alt="npm Downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/cesarandreslopez/occ/actions/workflows/ci.yml"><img src="https://github.com/cesarandreslopez/occ/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://deepwiki.com/cesarandreslopez/occ"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

<p align="center">
  <strong>Office Cloc and Count</strong> — document metrics, structure extraction, and code exploration for real repositories.
</p>

## What is this?

OCC started as a way to make office documents visible in the same workflows that already work well for code metrics tools like `scc` and `cloc`. In `0.3.0`, it also adds an on-demand code exploration surface under `occ code`, so the same CLI can now:

- scan office documents for word/page/sheet/slide metrics
- extract document heading structure for navigation and RAG-style use cases
- summarize code metrics through `scc`
- explore JavaScript, TypeScript, and Python repositories with symbol search, call analysis, dependency inspection, and inheritance queries

## Features

- **Office document metrics** — words, pages, paragraphs, slides, sheets, rows, cells
- **Seven formats supported** — DOCX, XLSX, PPTX, PDF, ODT, ODS, ODP
- **Document structure extraction** — `--structure` parses heading hierarchy into a navigable tree with dotted section codes (1, 1.1, 1.2, ...)
- **Code metrics via scc** — auto-detects code files and integrates scc output
- **Code exploration via `occ code`** — JS/TS and Python-first symbol lookup, content search, callers/callees, dependency categories, inheritance, and ambiguity-aware chains
- **Multiple output modes** — grouped by type, per-file breakdown, or JSON
- **CI-friendly** — ASCII-only, no-color mode for pipelines
- **Flexible filtering** — include/exclude extensions, exclude directories, .gitignore-aware
- **Progress bar** — with ETA for large scans
- **Zero config** — auto-downloads scc binary on install, works out of the box

## Quick Start

**Global install:**

```bash
npm i -g @cesarandreslopez/occ
occ
```

**No-install usage:**

```bash
npx @cesarandreslopez/occ docs/ reports/
```

**From source:**

```bash
git clone https://github.com/cesarandreslopez/occ.git && cd occ
npm install
npm run build
npm test
npm start
```

## Usage

```bash
# Scan current directory
occ

# Scan specific directories
occ docs/ reports/

# Per-file breakdown
occ --by-file docs/

# JSON output
occ --format json docs/

# Extract document structure (heading hierarchy)
occ --structure docs/

# Structure as JSON
occ --structure --format json docs/

# Explore JS/TS and Python code
occ code find name UserService --path .
occ code analyze callers createUser --path .
occ code analyze deps src/deps --path .
occ code analyze chain ambiguousCaller duplicate --path .

# Only specific formats
occ --include-ext pdf,docx docs/

# Skip code analysis
occ --no-code docs/

# CI-friendly (ASCII, no color)
occ --ci docs/
```

## Example Output

```
-- Documents ---------------------------------------------------------------
  Format    Files    Words    Pages                  Details      Size
----------------------------------------------------------------------------
  Word         12   34,210      137              1,203 paras    1.2 MB
  PDF           8   22,540       64                             4.5 MB
  Excel         3                                12 sheets      890 KB
----------------------------------------------------------------------------
  Total        23   56,750      201              1,203 paras    6.5 MB

-- Code (via scc) ----------------------------------------------------------
  Language    Files    Lines   Blanks  Comments     Code
----------------------------------------------------------------------------
  JavaScript     15     2340      180       320     1840
  Python          8     1200       90       150      960
----------------------------------------------------------------------------
  Total          23     3540      270       470     2800

Scanned 23 documents (56,750 words, 201 pages) in 120ms
```

### Structure Output (`--structure`)

```
-- Structure: report.docx --------------------------------------------------
1   Executive Summary
  1.1   Background ......................................... p.1
  1.2   Key Findings ....................................... p.1-2
2   Methodology
  2.1   Data Collection .................................... p.3
  2.2   Analysis Framework ................................. p.4
    2.2.1   Quantitative Methods ........................... p.4
    2.2.2   Qualitative Methods ............................ p.5
3   Results ................................................ p.6-8
4   Conclusions ............................................ p.9

4 sections, 10 nodes, max depth 3
```

## Supported Formats

| Format | Extension | Metrics | Structure |
|--------|-----------|---------|-----------|
| Word | `.docx` | words, pages*, paragraphs | Yes |
| PDF | `.pdf` | words, pages | Yes (with page mapping) |
| Excel | `.xlsx` | sheets, rows, cells | — |
| PowerPoint | `.pptx` | words, slides | Yes (slide headers) |
| ODT | `.odt` | words, pages*, paragraphs | Yes (best-effort) |
| ODS | `.ods` | sheets, rows, cells | — |
| ODP | `.odp` | words, slides | Yes (slide headers) |

\* Pages for Word/ODT are estimated at 250 words/page.

## CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--by-file` / `-f` | Row per file | grouped by type |
| `--format <type>` | `tabular` or `json` | `tabular` |
| `--structure` | Extract and display document heading hierarchy | off |
| `--include-ext <exts>` | Comma-separated extensions | all supported |
| `--exclude-ext <exts>` | Comma-separated to skip | none |
| `--exclude-dir <dirs>` | Directories to skip | `node_modules,.git` |
| `--no-gitignore` | Disable .gitignore respect | enabled |
| `--sort <col>` | Sort by: files, name, words, size | `files` |
| `--output <file>` / `-o` | Write to file | stdout |
| `--ci` | ASCII-only, no color | off |
| `--large-file-limit <mb>` | Skip files over this size | `50` |
| `--no-code` | Skip scc code analysis | off |

## Code Exploration

`occ code` adds on-demand code exploration without changing the existing document-scan workflow. It builds an in-memory repository graph for each command and does not require a database, daemon, or background indexer.

The first-class support path in `0.3.0` is **JavaScript, TypeScript, and Python**. Other languages may be discovered and partially parsed, but the current resolver, fixtures, and output contracts are intentionally optimized around JS/TS and Python behavior.

```bash
# Exact symbol lookup
occ code find name Greeter --path test/fixtures/code-explore

# Substring search
occ code find pattern service --path .

# Full-text content search
occ code find content normalize_name --path .

# Outgoing and incoming call analysis
occ code analyze calls bootstrap --path test/fixtures/code-explore
occ code analyze callers createUser --path test/fixtures/code-explore

# Dependency and inheritance inspection
occ code analyze deps src/service --path test/fixtures/code-explore
occ code analyze tree UserService --path test/fixtures/code-explore

# Ambiguity-aware chain analysis
occ code analyze chain ambiguousCaller duplicate --path test/fixtures/code-explore
```

Highlights of the current code exploration behavior:

- **Exact, pattern, type, and content search** over the repository graph
- **Call analysis** with explicit `resolved`, `ambiguous`, and `unresolved` states
- **Receiver-aware method resolution** for `this`, `super`, `self`, and `cls`
- **Dependency analysis** grouped into local, external, and unresolved imports
- **Chain analysis** that reports when a path is blocked by ambiguity instead of silently returning nothing
- **Shared CLI ergonomics** with `--path`, `--format`, `--output`, `--exclude-dir`, and `.gitignore` support

All `occ code` commands support `--format tabular|json`. Most symbol-targeted commands also support `--file` for disambiguation, and JSON output includes repository metadata, query metadata, results, repository stats, and per-language capability flags.

## Documentation

Full documentation is available at [cesarandreslopez.github.io/occ](https://cesarandreslopez.github.io/occ/), including:

- [Installation](https://cesarandreslopez.github.io/occ/getting-started/installation/)
- [Quick Start](https://cesarandreslopez.github.io/occ/getting-started/quick-start/)
- [CLI Reference](https://cesarandreslopez.github.io/occ/usage/cli-reference/)
- [Output Formats](https://cesarandreslopez.github.io/occ/usage/output-formats/)
- [Architecture](https://cesarandreslopez.github.io/occ/architecture/overview/)
- [Changelog](https://cesarandreslopez.github.io/occ/changelog/)

## Why OCC?

Tools like `scc`, `cloc`, and `tokei` give you instant visibility into codebases — lines, languages, complexity. But most projects also contain Word documents, PDFs, spreadsheets, and presentations that are invisible to these tools. OCC fills that gap.

### For Humans

- **Project audits** — instantly see how much documentation lives alongside your code: total word counts, page counts, spreadsheet sizes, and presentation lengths
- **Tracking documentation growth** — run OCC in CI to monitor how documentation scales over time, catch bloat early, or enforce minimums
- **Onboarding** — new team members get a quick sense of a project's documentation footprint before diving in
- **Migration planning** — when moving to a new platform, know exactly what you're dealing with across hundreds of files and formats

### For AI Agents

- **Context budgeting** — LLMs have finite context windows. OCC's word and page counts let agents estimate how much of a document set they can ingest before hitting token limits
- **Prioritization** — an agent deciding which documents to read can use OCC's JSON output to rank files by size, word count, or type, focusing on the most relevant content first
- **RAG chunk mapping** — `--structure --format json` outputs heading trees with character offsets, enabling chunk-to-section mapping, scoped retrieval, and citation paths in RAG pipelines
- **Repository mapping** — agents exploring an unfamiliar codebase can combine `occ --format json` for document inventory with `occ code ... --format json` for symbol and relationship data
- **Pipeline integration** — JSON output pipes directly into agent toolchains for automated document analysis, summarization, or compliance checking

## How It Works

OCC is written in TypeScript and uses [fast-glob](https://github.com/mrmlnc/fast-glob) for file discovery, dispatches to format-specific parsers (mammoth for DOCX, pdf-parse for PDF, SheetJS for XLSX, JSZip + officeparser for PPTX/ODF), aggregates metrics, and renders output via cli-table3. For code metrics, it shells out to a vendored [scc](https://github.com/boyter/scc) binary (auto-downloaded during `npm install`, with PATH fallback).

For structure extraction (`--structure`), documents are first converted to markdown (mammoth + [turndown](https://github.com/mixmark-io/turndown) for DOCX, pdf-parse with page markers for PDF), then headers are extracted and assembled into a tree with dotted section codes.

For `occ code`, OCC builds an in-memory code graph on demand. JavaScript and TypeScript are parsed with the TypeScript compiler API, Python uses a language-specific parser, and the query engine resolves symbols, imports, calls, inheritance, ambiguities, and dependency categories without a persistent database.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

[MIT](LICENSE)
