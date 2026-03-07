# Contributing

Thank you for your interest in contributing to OCC! This page mirrors the [CONTRIBUTING.md](https://github.com/cesarandreslopez/occ/blob/main/CONTRIBUTING.md) in the repository.

## Getting Started

### Prerequisites

- Node.js 18+

### Development Setup

```bash
git clone https://github.com/cesarandreslopez/occ.git
cd occ
npm install
```

### Verify Setup

```bash
node test/create-fixtures.js
node bin/occ.js test/fixtures/
```

## Available Commands

```bash
npm start                        # Run occ (equivalent to: node bin/occ.js)
npm install                      # Install deps + auto-download scc binary
npm link                         # Make `occ` available globally

# Generate test fixtures
node test/create-fixtures.js

# Verify document scanning
node bin/occ.js test/fixtures/
node bin/occ.js --format json test/fixtures/
node bin/occ.js --ci test/fixtures/
node bin/occ.js --by-file test/fixtures/
```

## Code Style

- ES modules (`"type": "module"`) throughout
- No build step — source files run directly via Node.js
- No test runner or linter configured yet — contributions to add these are welcome
- [Conventional Commits](https://www.conventionalcommits.org/) for commit messages

## Making Changes

1. Create a feature branch from `main`
2. Make your changes with clear commits
3. Ensure `node bin/occ.js test/fixtures/` runs successfully
4. Update documentation if needed
5. Submit a PR with a clear description

### Branch Naming

- `feature/description` — new features
- `fix/description` — bug fixes
- `docs/description` — documentation changes
- `refactor/description` — code refactoring

## Areas for Contribution

- Test framework setup and test coverage
- New output formats (CSV, HTML)
- Additional document format support
- Performance improvements for large directories
- Documentation and developer experience
- Bug fixes

Look for issues labeled `good first issue` for newcomers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
