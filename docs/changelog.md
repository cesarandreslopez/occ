# Changelog

This page mirrors the [CHANGELOG.md](https://github.com/cesarandreslopez/occ/blob/main/CHANGELOG.md) in the repository.

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-03-07

### Changed

- Rename "Extra" column to "Details" for clarity
- Remove redundant top/bottom table borders for cleaner output
- Remove inter-row separators, keep only header and totals borders
- Right-align numeric columns in document table
- Apply consistent number coloring to all scc table columns
- Make section header width match table width dynamically
- Use ASCII-only dashes in section headers during `--ci` mode
- Parsers return only populated metric fields instead of null-filled objects
- Batch stat calls in walker for better throughput on large directories
- Pass scc binary path explicitly instead of module-level state

### Added

- Summary line showing scan scope, word/page counts, and elapsed time
- Word and page counts in summary line for at-a-glance utility
- SHA-256 checksum verification for scc binary downloads in postinstall
- Input validation for `--large-file-limit` (rejects NaN values)

### Fixed

- "No office documents found." message no longer shown when code results are present
- Table separator width mismatch between top-mid and middle characters

## [0.1.1] - 2026-03-07

### Changed

- Replace ExcelJS with SheetJS (xlsx) for XLSX parsing, eliminating deprecated transitive dependencies (rimraf, fstream, inflight, lodash.isequal, glob v7)

### Fixed

- Ensure `test/fixtures/` directory exists before creating test fixtures (fixes CI failure)
- Fix `workflow_dispatch` trigger in docs workflow (remove invalid `branches` key)
- Fix Node 22+ compatibility in release workflow (`require()` instead of `import()` with `assert`)
- Update GitHub Pages deployment branch policy from `master` to `main`

## [0.1.0] - 2026-03-07

### Added

- CLI tool for scanning directories for office documents (DOCX, XLSX, PPTX, PDF, ODT, ODS, ODP)
- Word count, page count, paragraph count, slide count, sheet/row/cell count extraction
- Automatic code metrics via scc integration (vendored binary with PATH fallback)
- Per-file (`--by-file`) and grouped-by-type output modes
- JSON output (`--format json`) for automation
- Extension filtering (`--include-ext`, `--exclude-ext`)
- Directory exclusion (`--exclude-dir`, default: node_modules,.git)
- .gitignore-aware file discovery (disable with `--no-gitignore`)
- Sortable output (`--sort`: files, name, words, size)
- File output (`--output`)
- CI mode (`--ci`) for ASCII-only, no-color output
- Large file skip threshold (`--large-file-limit`, default: 50MB)
- Progress bar with ETA
- Auto-download of scc binary during `npm install` (skip with `SCC_SKIP_DOWNLOAD=1`)

[0.1.2]: https://github.com/cesarandreslopez/occ/releases/tag/v0.1.2
[0.1.1]: https://github.com/cesarandreslopez/occ/releases/tag/v0.1.1
[0.1.0]: https://github.com/cesarandreslopez/occ/releases/tag/v0.1.0
