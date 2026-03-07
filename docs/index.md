<h1 align="center">OCC</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@cesarandreslopez/occ"><img src="https://img.shields.io/npm/v/@cesarandreslopez/occ?label=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@cesarandreslopez/occ"><img src="https://img.shields.io/npm/dt/@cesarandreslopez/occ?label=npm%20Downloads" alt="npm Downloads"></a>
  <a href="https://github.com/cesarandreslopez/occ/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/cesarandreslopez/occ/actions/workflows/ci.yml"><img src="https://github.com/cesarandreslopez/occ/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <strong>Office Cloc and Count</strong> — scc-style summary tables for office documents.
</p>

---

OCC scans directories for office documents (DOCX, XLSX, PPTX, PDF, ODT, ODS, ODP), extracts metrics like word counts, page counts, slide counts, and cell counts, and displays them in scc-style summary tables. When code files are also present, it auto-detects them and shells out to [scc](https://github.com/boyter/scc) for code metrics, printing both sections together.

```
-- Documents -----------------------------------------------------------
Format        Files    Words    Pages    Extra          Size
--------------------------------------------------------------------
Word             12   34,210      137    1,203 paras    1.2 MB
PDF               8   22,540       64                   4.5 MB
Excel             3                      12 sheets      890 KB
--------------------------------------------------------------------
Total            23   56,750      201    1,203 paras    6.5 MB
--------------------------------------------------------------------

-- Code (via scc) ------------------------------------------------------
Language         Files    Lines   Blanks  Comments     Code
--------------------------------------------------------------------
JavaScript          15     2340      180       320     1840
Python               8     1200       90       150      960
--------------------------------------------------------------------
Total               23     3540      270       470     2800
--------------------------------------------------------------------
```

## Feature Highlights

- **Office document metrics** — words, pages, paragraphs, slides, sheets, rows, cells
- **Seven formats supported** — DOCX, XLSX, PPTX, PDF, ODT, ODS, ODP
- **Code metrics via scc** — auto-detects code files and integrates scc output
- **Multiple output modes** — grouped by type, per-file breakdown, or JSON
- **CI-friendly** — ASCII-only, no-color mode for pipelines
- **Flexible filtering** — include/exclude extensions, exclude directories, .gitignore-aware
- **Progress bar** — with ETA for large scans
- **Zero config** — auto-downloads scc binary on install, works out of the box

## Quick Install

```bash
# Global install
npm i -g @cesarandreslopez/occ
occ

# No-install usage
npx @cesarandreslopez/occ docs/ reports/
```

## Next Steps

- [Installation](getting-started/installation.md) — all install methods
- [Quick Start](getting-started/quick-start.md) — first-run walkthrough
- [CLI Reference](usage/cli-reference.md) — every flag explained
- [Architecture](architecture/overview.md) — how it all fits together
