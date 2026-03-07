# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install deps + auto-download scc binary via postinstall
npm start            # Run occ (equivalent to: node bin/occ.js)
npm link             # Make `occ` available globally

# Run directly
node bin/occ.js [directories...] [options]

# Generate test fixtures (DOCX + XLSX samples)
node test/create-fixtures.js
```

No test runner, linter, or build step is configured.

## Architecture

OCC is an ES module (`"type": "module"`) CLI tool that scans directories for office documents, extracts metrics, and optionally shells out to [scc](https://github.com/boyter/scc) for code metrics.

### Module flow

```
bin/occ.js → src/cli.js (orchestrator)
               ├→ src/walker.js        — file discovery via fast-glob
               ├→ src/parsers/index.js — routes to format-specific parser
               │    ├→ parsers/docx.js — mammoth (words, pages, paragraphs)
               │    ├→ parsers/pdf.js  — pdf-parse (words, pages)
               │    ├→ parsers/xlsx.js — SheetJS/xlsx (sheets, rows, cells)
               │    ├→ parsers/pptx.js — JSZip + officeparser (words, slides)
               │    └→ parsers/odf.js  — JSZip + officeparser (odt/ods/odp)
               ├→ src/stats.js         — aggregation, sorting, column detection
               ├→ src/scc.js           — finds/invokes vendored or PATH scc binary
               └→ src/output/
                    ├→ tabular.js      — cli-table3 terminal tables
                    └→ json.js         — JSON output
```

### Key patterns

- **Parser interface**: Each parser returns `{ fileType, metrics }`. The router in `parsers/index.js` dispatches by extension and wraps results with `{ filePath, size, success }`.
- **Batch concurrency**: `parseFiles()` processes 10 files concurrently using chunked `Promise.allSettled`.
- **scc integration**: `src/scc.js` prefers the vendored binary at `vendor/scc`, falls back to PATH. The postinstall script (`scripts/postinstall.js`) downloads scc v3.7.0 for the current platform. Set `SCC_SKIP_DOWNLOAD=1` to skip.
- **Output modes**: Stats object from `aggregate()` drives both tabular and JSON formatters. Columns are auto-detected based on which metrics have data.
- **`src/utils.js`**: Shared helpers — `countWords`, `formatBytes`, `formatNumber`, `getExtension`, `OFFICE_EXTENSIONS`, `EXTENSION_TO_TYPE`.

## Verification

- Run `node bin/occ.js test/fixtures/` to verify document scanning works
- Run `node bin/occ.js --format json test/fixtures/` to verify JSON output
