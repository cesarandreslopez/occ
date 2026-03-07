# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/cesarandreslopez/occ/releases/tag/v0.1.0
