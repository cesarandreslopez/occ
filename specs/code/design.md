# code — Design Spec

## Purpose

Code structure analysis for the `occ code` subcommand family — discovers code
files, parses them for symbols/imports/calls/inheritance, builds a graph index,
and supports find/analyze queries with formatted output.

## Public Interface

Exports from `src/code/command.ts`:
- `registerCodeCommands(program: Command): void`

All other exports are module-internal (consumed only within `code/`).

## Internal Structure

```
src/code/
├── types.ts       — CodeNode, CodeEdge, CodebaseIndex, query result types (192 lines)
├── languages.ts   — Language specs, extension mappings, capabilities (147 lines)
├── discover.ts    — Code file discovery via fast-glob
├── parsers.ts     — Regex-based code parsing: symbols, imports, calls (537 lines)
├── build.ts       — Codebase index builder: files → nodes + edges (384 lines)
├── query.ts       — Graph queries: deps, callers, chains, tree (321 lines)
├── output.ts      — Code query formatters: tables, JSON payloads (294 lines)
└── command.ts     — CLI registration for code subcommands (223 lines)
```

Internal dependency flow:
```
command.ts → build.ts → discover.ts → languages.ts → types.ts
           → query.ts → languages.ts → types.ts
           → output.ts → types.ts
```

## Dependencies

- **Allowed imports:** `shared` (`utils.ts`), `pipeline` (`cli-validation.ts`),
  `output` (`output/tabular.ts`)
- **Forbidden imports:** `content`, `inspect-commands`, `cli`

Specific cross-module imports:
- `code/command.ts` → `utils.ts` (writeStream)
- `code/command.ts` → `cli-validation.ts` (parsePositiveInt)
- `code/output.ts` → `output/tabular.ts` (sectionHeader, stripAnsi, tableChars)
- `code/output.ts` → `utils.ts` (formatNumber)

## Files to Move

| Source (current) | Destination (target) | Notes |
|-----------------|---------------------|-------|
| — | — | No files move. |

## Open Questions

- `code/parsers.ts` is the largest file (537 lines). It could be split into
  `code/parsers/ts-parser.ts` and `code/parsers/regex-parser.ts` in a future
  phase, but this is an intra-module refactoring concern, not an architecture
  concern.
- `code/build.ts` (384 lines) has high cognitive complexity. It could benefit
  from extracting resolution logic into helper functions, but again this is
  internal to the module.
