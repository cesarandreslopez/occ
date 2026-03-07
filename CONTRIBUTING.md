# Contributing to OCC

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 18+

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/cesarandreslopez/occ.git
   cd occ
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify setup**
   ```bash
   node test/create-fixtures.js
   node bin/occ.js test/fixtures/
   ```

## Development Workflow

### Running Locally

```bash
node bin/occ.js [directories...] [options]
```

### Available Commands

```bash
npm start                        # Run occ (equivalent to: node bin/occ.js)
npm install                      # Install deps + auto-download scc binary via postinstall
npm link                         # Make `occ` available globally

# Generate test fixtures
node test/create-fixtures.js

# Verify document scanning
node bin/occ.js test/fixtures/
node bin/occ.js --format json test/fixtures/
node bin/occ.js --ci test/fixtures/
node bin/occ.js --by-file test/fixtures/
node bin/occ.js --no-code test/fixtures/
```

### Code Style

- ES modules (`"type": "module"`) throughout
- No build step — source files run directly via Node.js
- No test runner or linter configured yet — contributions to add these are welcome

## Project Structure

```
occ/
├── bin/occ.js              # Entry point
├── src/
│   ├── cli.js              # Orchestrator
│   ├── walker.js           # File discovery via fast-glob
│   ├── parsers/
│   │   ├── index.js        # Routes to format-specific parser
│   │   ├── docx.js         # mammoth (words, pages, paragraphs)
│   │   ├── pdf.js          # pdf-parse (words, pages)
│   │   ├── xlsx.js         # SheetJS/xlsx (sheets, rows, cells)
│   │   ├── pptx.js         # JSZip + officeparser (words, slides)
│   │   └── odf.js          # JSZip + officeparser (odt/ods/odp)
│   ├── stats.js            # Aggregation, sorting, column detection
│   ├── scc.js              # Finds/invokes vendored or PATH scc binary
│   ├── utils.js            # Shared helpers
│   └── output/
│       ├── tabular.js      # cli-table3 terminal tables
│       └── json.js         # JSON output
├── scripts/postinstall.js  # Downloads scc binary for current platform
├── test/
│   └── create-fixtures.js  # Generates DOCX + XLSX test samples
└── vendor/                 # Vendored scc binary (auto-downloaded)
```

### Key Architecture Concepts

- **Parser interface**: Each parser returns `{ fileType, metrics }`. The router in `parsers/index.js` dispatches by extension and wraps results with `{ filePath, size, success }`
- **Batch concurrency**: `parseFiles()` processes 10 files concurrently using chunked `Promise.allSettled`
- **scc integration**: `src/scc.js` prefers the vendored binary at `vendor/scc`, falls back to PATH. The postinstall script downloads scc v3.7.0 for the current platform
- **Output modes**: Stats object from `aggregate()` drives both tabular and JSON formatters. Columns are auto-detected based on which metrics have data

## Making Changes

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring

### Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add CSV output format
fix: handle empty DOCX files gracefully
docs: update README with troubleshooting section
refactor: extract word counting into shared utility
```

Guidelines:
- Use present tense, imperative mood ("add feature" not "added feature")
- Keep the first line under 72 characters
- Reference issues when applicable (`Fix #123`)

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes with clear commits
3. Ensure `node bin/occ.js test/fixtures/` runs successfully
4. Update documentation if needed
5. Submit a PR with a clear description

## Areas for Contribution

### Good First Issues

Look for issues labeled `good first issue` -- these are suitable for newcomers.

### Current Priorities

- Test framework setup and test coverage
- New output formats (CSV, HTML)
- Additional document format support
- Performance improvements for large directories
- Documentation and developer experience
- Bug fixes

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
