# Codebase Discovery — 2026-03-14

## Vital Statistics
- **Total TS/TSX files:** 58 (56 source + 2 declaration files in `src/@types/`)
- **Total lines of code:** 7,526
- **Framework(s):** CLI tool using Commander.js; no UI framework
- **Node version:** >=18.0.0 (engines), running v24.13.1
- **TypeScript version:** 5.9.3
- **Strict mode:** Yes (`"strict": true`)
- **Module system:** ESM (`"type": "module"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`)
- **Bundler/build:** `tsc` only (no bundler)
- **Entry point(s):** `bin/occ.ts` → `src/cli.ts`

## Current Structure

```
src/
├── @types/             # Custom type declarations (mammoth, pdf-parse)
├── code/               # `occ code` subcommands (explore, build, find, query)
│   ├── build.ts        (384 lines)
│   ├── command.ts      (223 lines)
│   ├── discover.ts
│   ├── languages.ts    (147 lines)
│   ├── output.ts       (294 lines)
│   ├── parsers.ts      (537 lines) ← LARGEST FILE
│   ├── query.ts        (321 lines)
│   └── types.ts        (192 lines)
├── doc/                # `occ doc inspect` for DOCX/ODT/PDF
│   ├── command.ts
│   ├── inspect.ts
│   ├── inspect-docx.ts (219 lines)
│   ├── inspect-odt.ts
│   ├── inspect-pdf.ts
│   ├── output.ts
│   └── types.ts
├── inspect/            # Shared inspect utilities
│   └── shared.ts
├── markdown/           # Document → markdown conversion
│   └── convert.ts      (137 lines)
├── output/             # Output formatters
│   ├── json.ts
│   ├── tabular.ts      (278 lines)
│   └── tree.ts         (115 lines)
├── parsers/            # Format-specific document parsers
│   ├── docx.ts
│   ├── index.ts
│   ├── odf.ts
│   ├── pdf.ts
│   ├── pptx.ts
│   └── xlsx.ts
├── sheet/              # `occ sheet inspect`
│   ├── command.ts
│   ├── inspect.ts      (528 lines) ← 2ND LARGEST
│   ├── output.ts       (189 lines)
│   └── types.ts        (146 lines)
├── slide/              # `occ slide inspect`
│   ├── command.ts
│   ├── inspect.ts
│   ├── inspect-odp.ts
│   ├── inspect-pptx.ts (183 lines)
│   ├── output.ts
│   └── types.ts
├── structure/          # Structure extraction (headers → tree)
│   ├── extract.ts      (214 lines)
│   ├── index.ts
│   └── types.ts
├── table/              # `occ table inspect`
│   ├── command.ts
│   ├── inspect.ts
│   ├── inspect-docx.ts
│   ├── inspect-odp.ts
│   ├── inspect-odt.ts
│   ├── inspect-pptx.ts (133 lines)
│   ├── inspect-xlsx.ts (189 lines)
│   ├── output.ts
│   └── types.ts
├── cli.ts              (231 lines) — orchestrator
├── cli-validation.ts   — shared CLI validation helpers
├── progress.ts         — progress reporting
├── scc.ts              (128 lines) — scc binary integration
├── stats.ts            (129 lines) — aggregation
├── types.ts            — shared types (FileEntry, ParseResult, etc.)
├── utils.ts            — shared helpers
└── walker.ts           (89 lines) — file discovery
```

## Problem Areas

| File | Lines | Why it's a problem |
|------|-------|--------------------|
| `src/code/parsers.ts` | 537 | Largest file; regex-based code parsing for multiple languages. Mixes TS AST parsing with generic regex fallback. 5 implicit `any` parameters. |
| `src/sheet/inspect.ts` | 528 | Second largest; single file handles all sheet inspection logic. |
| `src/code/build.ts` | 384 | Complex codebase index builder with many `let` variables and mutable state. |
| `src/code/query.ts` | 321 | Graph query logic — deps, callers, chains, tree. High cognitive load. |
| `src/code/output.ts` | 294 | Large formatter with 7 exported functions. |
| `src/output/tabular.ts` | 278 | Complex table formatting with many `let` variables. |
| `src/cli.ts` | 231 | Orchestrator with 26 imports (highest fan-out). 6 `let` variables for mutable state. |

## Dependency Hotspots

### Files with most importers (high fan-in)
| Import path | Count |
|-------------|-------|
| `./types.js` (local) | 36 |
| `zod` | 34 |
| `../utils.js` | 26 |
| `../inspect/shared.js` | 23 |
| `node:path` | 20 |
| `node:fs/promises` | 20 |
| `jszip` | 10 |
| `chalk` | 7 |
| `../types.js` | 6 |
| `commander` | 6 |
| `xlsx` | 5 |
| `../output/tabular.js` | 5 |
| `./output.js` | 5 |
| `../cli-validation.js` | 5 |
| `cli-table3` | 5 |

### Files with most imports (high fan-out)
| File | Import count |
|------|-------------|
| `src/cli.ts` | 26 |
| `src/table/inspect.ts` | 10 |
| `src/table/command.ts` | 10 |
| `src/slide/command.ts` | 10 |
| `src/doc/inspect.ts` | 10 |
| `src/doc/command.ts` | 10 |
| `src/code/command.ts` | 10 |
| `src/sheet/command.ts` | 9 |
| `src/markdown/convert.ts` | 8 |

### Most frequently changed files (git history)
| Changes | File |
|---------|------|
| 8 | `src/cli.ts` |
| 7 | `src/code/query.ts` |
| 5 | `src/code/types.ts` |
| 5 | `src/code/build.ts` |
| 4 | `src/parsers/xlsx.ts` |
| 4 | `src/code/command.ts` |

## Circular Dependencies

**None found.** `npx madge --circular` reports zero circular dependencies.

The codebase has a clean DAG structure.

## Type Safety Gaps

- **Files with `any` usage:** 0 (no explicit `any` types in source)
- **`@ts-ignore` / `@ts-expect-error` count:** 0
- **Implicit `any` in `src/code/parsers.ts`:** 5 parameters have implicit `any` type when `typescript` module is not installed as a production dependency (lines 39, 115, 123, 131 — parameters referencing TypeScript AST nodes). These are caught by `--noImplicitAny` (part of `strict`) and currently pass because `typescript` is a devDependency.
- **Missing explicit return types on exported functions:** ~13 exported functions lack explicit return type annotations (they rely on inference). These include `registerCodeCommands`, `registerDocCommands`, `registerSheetCommands`, `registerSlideCommands`, `registerTableCommands`, `resolveLocalImport`, `resolvePythonImport`, `inspectDocx`, `inspectPdf`, `inspectOdt`, `inspectOdp`, `inspectPptx`, `formatJson`.

## Global / Singleton State

The codebase uses `let` in several places for loop-scoped and function-scoped mutable variables. Notable module-level or semi-global mutable patterns:

| File | Line | Pattern | Risk |
|------|------|---------|------|
| `src/cli.ts` | 135 | `let sccBinary: string \| null = null` | Function-scoped, low risk |
| `src/cli.ts` | 150 | `let results: ParseResult[] = []` | Function-scoped, low risk |
| `src/cli.ts` | 162 | `let sccData: SccLanguage[] \| null = null` | Function-scoped, low risk |
| `src/cli.ts` | 179 | `let structureResults: StructureResult[] = []` | Function-scoped, low risk |
| `src/cli.ts` | 190 | `let output: string` | Function-scoped, low risk |
| `src/walker.ts` | 32 | `let extensions = OFFICE_EXTENSIONS` | Function-scoped, reassigned conditionally |
| `src/output/tabular.ts` | 86 | `let totalFiles = 0, totalLines = 0, ...` | Function-scoped counters |
| `src/code/build.ts` | 163-337 | Multiple `let` for Map lookups and resolution | Function-scoped, moderate complexity |
| `src/code/parsers.ts` | 241-489 | `let calleeName`, `let match` | Function-scoped |
| `src/markdown/convert.ts` | 34 | `let data` | Function-scoped |

**No true singletons, global mutable state, or module-level side effects found.** All mutable variables are function-scoped.

## Existing Import Rules

No `scripts/check-imports.mjs` file exists. There is no automated import/DAG enforcement in the codebase.

## Test Baseline

- **Can tests run?** Yes
- **Test command:** `npm test` → `npm run build && node --import tsx --test test/**/*.test.ts`
- **Test runner:** Node.js built-in `node:test` runner via `tsx`
- **Passing:** 55 / 55
- **Failing:** 0
- **Cancelled:** 0
- **Duration:** ~1.84s
- **Test files:**
  - `test/code-explore.test.ts` — 32 tests (code indexing, queries, chains, deps, inheritance)
  - `test/doc-inspect.test.ts` — 7 tests (DOCX inspection, structure, CLI)
  - `test/sheet-inspect.test.ts` — 4 tests (XLSX inspection, CLI)
  - `test/slide-inspect.test.ts` — 8 tests (PPTX inspection, CLI)
  - `test/table-inspect.test.ts` — *missing* (no test file found)
- **No tests for:**
  - `src/table/` (table inspection — no test file exists)
  - `src/parsers/` (document parsers — tested indirectly through doc/sheet/slide)
  - `src/walker.ts` (file discovery)
  - `src/stats.ts` (aggregation)
  - `src/scc.ts` (scc binary integration)
  - `src/output/` (output formatters — tested indirectly through CLI tests)
  - `src/markdown/convert.ts` (markdown conversion)
  - `src/structure/` (structure extraction — tested indirectly through doc inspect)
  - `src/cli.ts` (orchestrator — tested indirectly)
  - `src/utils.ts` (shared helpers)

## Typecheck Baseline

- **Status:** Clean (exit code 0)
- **Errors:** 0

## Summary Assessment

This is a well-structured, medium-size CLI codebase (7,526 lines across 58 files) with:

1. **Clean dependency graph** — no circular dependencies
2. **Full strict mode** — zero `any`, zero `@ts-ignore`
3. **Good modular organization** — domain-specific directories (code, doc, sheet, slide, table)
4. **Solid test coverage** for core features (55 tests, all passing)
5. **Key risk areas:**
   - `src/code/parsers.ts` (537 lines) and `src/sheet/inspect.ts` (528 lines) are the largest files
   - `src/cli.ts` has 26 imports (highest fan-out) and changes most frequently
   - No import DAG enforcement exists
   - Table inspection has no dedicated tests
   - ~13 exported functions lack explicit return types
6. **No existing import linter** — `scripts/check-imports.mjs` does not exist despite being referenced in AGENTS.md
