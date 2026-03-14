# Target Architecture

## Assessment

The existing directory structure is already well-organized. Each domain directory
(`code/`, `doc/`, `sheet/`, `slide/`, `table/`) is cohesive with a consistent
internal pattern (`command.ts`, `inspect.ts`, `output.ts`, `types.ts`).
Infrastructure directories (`parsers/`, `output/`, `structure/`, `markdown/`,
`inspect/`) are each focused on a single concern.

**What needs to change:**

1. Root-level files (`types.ts`, `utils.ts`, `stats.ts`, `walker.ts`, `scc.ts`,
   `progress.ts`, `cli-validation.ts`, `cli.ts`) lack formal module boundaries.
2. No import DAG enforcement exists (`scripts/check-imports.mjs` is missing).
3. One cross-domain dependency: `table/inspect-xlsx.ts` → `sheet/inspect.ts`
   (imports `getCell`, `renderCell`, `isNonEmptyCell`).

**What stays the same:**

The directory structure is kept as-is. No files move between directories.
The refactoring focuses on (a) enforcing the implicit dependency rules that
already exist and (b) extracting shared XLSX cell utilities to break the
cross-domain dependency.

## Modules

### Module 1: `shared` (Layer 0 — Foundation)

**Purpose:** Base types and pure utility functions with zero internal dependencies.

**Current files:**
- `src/types.ts` — FileEntry, SkippedEntry, ParserOutput, ParseResult
- `src/utils.ts` — countWords, formatBytes, formatNumber, getExtension, OFFICE_EXTENSIONS, EXTENSION_TO_TYPE, METRIC_FIELDS, writeStream
- `src/@types/mammoth.d.ts` — mammoth type declarations
- `src/@types/pdf-parse.d.ts` — pdf-parse type declarations

**Dependencies:** None (only external: `zod`, `node:path`)

**Public API:** All exports from `types.ts` and `utils.ts`.

### Module 2: `pipeline` (Layer 1 — Scanning Infrastructure)

**Purpose:** Core document scanning pipeline — file discovery, document parsing,
aggregation, scc integration, progress reporting, and CLI validation helpers.

**Current files:**
- `src/walker.ts` — file discovery via fast-glob
- `src/parsers/index.ts` — parser router and batch processor
- `src/parsers/docx.ts` — DOCX parser (mammoth)
- `src/parsers/pdf.ts` — PDF parser (pdf-parse)
- `src/parsers/xlsx.ts` — XLSX parser (SheetJS)
- `src/parsers/pptx.ts` — PPTX parser (JSZip + officeparser)
- `src/parsers/odf.ts` — ODF parser (JSZip + officeparser)
- `src/stats.ts` — aggregation, sorting, column detection
- `src/scc.ts` — scc binary integration
- `src/progress.ts` — terminal progress bar
- `src/cli-validation.ts` — CLI option validation schemas

**Dependencies:** `shared` (types.ts, utils.ts)

**Public API:**
- `findFiles` from walker.ts
- `parseFiles`, `parseFile` from parsers/index.ts
- `aggregate` and related types from stats.ts
- `checkScc`, `runScc` and related types from scc.ts
- `createProgress` from progress.ts
- `parsePositiveInt`, `parseHeaderRow`, `validateLargeFileLimit` from cli-validation.ts

### Module 3: `content` (Layer 1 — Content Extraction)

**Purpose:** Document content transformation and shared inspection utilities —
markdown conversion, structure extraction, and common inspect helpers.

**Current files:**
- `src/markdown/convert.ts` — document → markdown conversion
- `src/structure/types.ts` — StructureNode, DocumentStructure, PageMapping + tree utilities
- `src/structure/extract.ts` — header extraction, tree building, page mapping
- `src/structure/index.ts` — barrel re-exports
- `src/inspect/shared.ts` — DocumentProperties, estimateTokens, createInspectPayload

**Dependencies:** `shared` (utils.ts)

**Public API:**
- `documentToMarkdown` from markdown/convert.ts
- All exports from structure/index.ts
- All exports from inspect/shared.ts

### Module 4: `output` (Layer 2 — Output Formatting)

**Purpose:** Format scan results for terminal display (tabular, JSON, tree).

**Current files:**
- `src/output/tabular.ts` — cli-table3 terminal tables, section headers, summary
- `src/output/json.ts` — JSON output formatter
- `src/output/tree.ts` — structure tree formatter, StructureResult type

**Dependencies:** `shared` (utils.ts), `pipeline` (stats types, scc types), `content` (structure types)

**Public API:**
- `formatDocumentTable`, `formatSccTable`, `formatSummaryLine`, `sectionHeader`, `stripAnsi`, `tableChars` from tabular.ts
- `formatJson` from json.ts
- `formatStructureTree`, `formatStructureJson`, `StructureResult` from tree.ts

### Module 5: `code` (Layer 3 — Code Analysis)

**Purpose:** Code structure analysis — file discovery, parsing, index building,
graph queries, and formatted output for the `occ code` subcommand family.

**Current files:**
- `src/code/types.ts` — CodeNode, CodeEdge, CodebaseIndex, query result types
- `src/code/languages.ts` — language specs and extension mappings
- `src/code/discover.ts` — code file discovery via fast-glob
- `src/code/parsers.ts` — regex-based code parsing (functions, classes, imports)
- `src/code/build.ts` — codebase index builder
- `src/code/query.ts` — graph queries (deps, callers, chains, tree)
- `src/code/output.ts` — code query formatters
- `src/code/command.ts` — CLI registration for code subcommands

**Dependencies:** `shared` (utils.ts), `pipeline` (cli-validation.ts), `output` (output/tabular.ts)

**Public API:**
- `registerCodeCommands` from command.ts

### Module 6: `inspect-commands` (Layer 3 — Domain Inspection Commands)

**Purpose:** Domain-specific document inspection commands — deep inspection of
DOCX, PDF, XLSX, PPTX, ODP, ODS, and ODT files via the `occ doc|sheet|slide|table`
subcommand families.

**Current files:**

*doc/ (7 files):*
- `src/doc/types.ts`, `src/doc/command.ts`, `src/doc/inspect.ts`
- `src/doc/inspect-docx.ts`, `src/doc/inspect-pdf.ts`, `src/doc/inspect-odt.ts`
- `src/doc/output.ts`

*sheet/ (4 files):*
- `src/sheet/types.ts`, `src/sheet/command.ts`, `src/sheet/inspect.ts`
- `src/sheet/output.ts`

*slide/ (6 files):*
- `src/slide/types.ts`, `src/slide/command.ts`, `src/slide/inspect.ts`
- `src/slide/inspect-pptx.ts`, `src/slide/inspect-odp.ts`
- `src/slide/output.ts`

*table/ (9 files):*
- `src/table/types.ts`, `src/table/command.ts`, `src/table/inspect.ts`
- `src/table/inspect-docx.ts`, `src/table/inspect-xlsx.ts`, `src/table/inspect-pptx.ts`
- `src/table/inspect-odt.ts`, `src/table/inspect-odp.ts`
- `src/table/output.ts`

**Dependencies:** `shared` (utils.ts), `pipeline` (cli-validation.ts),
`content` (inspect/shared.ts, structure/, markdown/), `output` (output/tabular.ts)

**Internal cross-dep:** `table/inspect-xlsx.ts` imports `getCell`, `renderCell`,
`isNonEmptyCell` from `sheet/inspect.ts`. See Circular Dependency Resolution Plan.

**Public API:**
- `registerDocCommands` from doc/command.ts
- `registerSheetCommands` from sheet/command.ts
- `registerSlideCommands` from slide/command.ts
- `registerTableCommands` from table/command.ts

### Module 7: `cli` (Layer 4 — Orchestrator)

**Purpose:** Top-level CLI program definition, option parsing, and orchestration
of the scanning pipeline. Entry point for `bin/occ.ts`.

**Current files:**
- `src/cli.ts` — Commander.js program, execute() pipeline

**Dependencies:** All modules (shared, pipeline, content, output, code, inspect-commands)

**Public API:**
- `run` from cli.ts

## Dependency DAG

```
Layer 4:  cli
           │
           ├──────────────────────────────┐
           │                              │
Layer 3:  code                     inspect-commands
           │                         │    │
           ├─── output ◄─────────────┘    │
           │      │                       │
Layer 2:   │      ├── pipeline ◄──────────┤
           │      │      │                │
Layer 1:   │      └── content ◄───────────┘
           │             │
Layer 0:   └──────── shared ◄─────────────────
```

**Rule: No arrows may point upward.** All dependencies flow downward
from higher layers to lower layers.

### Allowed Dependencies (for check-imports.mjs)

```
ALLOWED_DEPS = {
  // Layer 0: Foundation — no internal deps
  'types':          [],
  'utils':          [],
  '@types':         [],

  // Layer 1: Infrastructure — depends on shared only
  'walker':         ['types', 'utils'],
  'parsers':        ['types', 'utils'],
  'stats':          ['types', 'utils'],
  'scc':            ['utils'],
  'progress':       [],
  'cli-validation': [],
  'inspect':        [],
  'structure':      [],
  'markdown':       ['utils'],

  // Layer 2: Output — depends on shared + infrastructure
  'output':         ['utils', 'stats', 'scc', 'structure'],

  // Layer 3: Domain commands — depends on shared + infrastructure + output
  'code':           ['utils', 'cli-validation', 'output'],
  'doc':            ['utils', 'cli-validation', 'inspect', 'structure', 'markdown', 'output'],
  'sheet':          ['utils', 'cli-validation', 'inspect', 'output'],
  'slide':          ['utils', 'cli-validation', 'inspect', 'output'],
  'table':          ['utils', 'cli-validation', 'inspect', 'output', 'sheet'],

  // Layer 4: Orchestrator — can import anything
  'cli':            ['*'],
}
```

**Note:** Intra-module imports (e.g., `code/build.ts` → `code/types.ts`) are
always allowed and not checked. Only cross-module imports are enforced.

## Decisions

### D1: Keep existing directory structure

**Decision:** Do not move files between directories.

**Rationale:** The existing structure is already well-organized. Each directory
is cohesive with a clear single responsibility. Moving files would create churn
with no architectural benefit. The codebase is small (7,526 lines) and the
current 11-directory structure with consistent patterns is easy to navigate.

### D2: Root-level files stay at root

**Decision:** Keep `types.ts`, `utils.ts`, `stats.ts`, `walker.ts`, `scc.ts`,
`progress.ts`, `cli-validation.ts`, `cli.ts` at the `src/` root rather than
creating new subdirectories for them.

**Rationale:** Each is a single file with a clear name. Creating directories
for single files adds noise. The import DAG enforcement treats them as
individual modules at the directory/file level, which works correctly.

### D3: `table → sheet` cross-domain dependency

**Decision:** Extract `getCell`, `renderCell`, `isNonEmptyCell` from
`sheet/inspect.ts` into a new shared file `src/inspect/xlsx-cells.ts`,
which both `sheet/inspect.ts` and `table/inspect-xlsx.ts` will import from.

**Rationale:** These three functions are pure XLSX cell utilities that work
with SheetJS `CellObject` types. They don't depend on sheet inspection logic.
Moving them to `inspect/` (Layer 1) eliminates the table→sheet cross-dep
without creating a new directory.

**Alternative considered:** Accept the dependency as intentional. Rejected
because the DAG should not have peer-level cross-dependencies between domain
command modules.

### D4: `inspect/shared.ts` stays in `inspect/`

**Decision:** Keep `inspect/shared.ts` where it is rather than merging into
`utils.ts`.

**Rationale:** Its exports (`DocumentProperties`, `estimateTokens`,
`createInspectPayload`) are domain-specific to document inspection, not
general utilities. Keeping them separate maintains cohesion.

### D5: `cli-validation.ts` stays at root

**Decision:** Keep `cli-validation.ts` at root rather than moving into a CLI
module or the `inspect/` directory.

**Rationale:** It's imported by 5 command files across different domains.
It has zero internal dependencies. As a single root file, it's easy to find
and its purpose is clear from the name.

### D6: `output/tree.ts` StructureResult type stays in output/

**Decision:** Keep `StructureResult` (which combines a file path, a
`DocumentStructure`, and raw markdown) defined in `output/tree.ts`.

**Rationale:** This type exists to serve the output formatting concern. It's
consumed by `cli.ts` and `output/json.ts`. Moving it to `structure/` would
create a circular dependency since `output/tree.ts` already imports from
`structure/types.ts`.

### D7: No new barrel `index.ts` files

**Decision:** Do not add `index.ts` barrel files to directories that don't
have them (only `structure/` and `parsers/` currently have them).

**Rationale:** The codebase uses direct file imports everywhere. Adding barrels
would change import paths across many files for no functional benefit. The
refactoring goal is enforcement, not cosmetic restructuring.

## Global State Migration Plan

| Global | Current Location | Strategy |
|--------|-----------------|----------|
| *None found* | — | No action needed |

**Assessment:** The codebase has no module-level mutable singletons, no global
registries, and no shared mutable state. All `let` variables identified in
discovery.md are function-scoped. The `loadPkg()` top-level await in `cli.ts`
produces an immutable `pkg` constant. No migration is needed.

## Circular Dependency Resolution Plan

| Cycle | Strategy |
|-------|----------|
| *None found* | No circular dependencies exist (confirmed by `npx madge --circular`) |

**Cross-domain dependency (not a cycle):**

| Dependency | Strategy |
|------------|----------|
| `table/inspect-xlsx.ts` → `sheet/inspect.ts` (imports `getCell`, `renderCell`, `isNonEmptyCell`) | Extract these 3 functions into `src/inspect/xlsx-cells.ts`. Both `sheet/inspect.ts` and `table/inspect-xlsx.ts` import from `inspect/xlsx-cells.ts` instead. This moves the dependency from Layer 3→Layer 3 (peer) to Layer 3→Layer 1 (downward). |

## Complete File Mapping

Every file in `src/` maps to exactly one target module.

| File | Module | Layer |
|------|--------|-------|
| `src/types.ts` | shared | 0 |
| `src/utils.ts` | shared | 0 |
| `src/@types/mammoth.d.ts` | shared | 0 |
| `src/@types/pdf-parse.d.ts` | shared | 0 |
| `src/walker.ts` | pipeline | 1 |
| `src/parsers/index.ts` | pipeline | 1 |
| `src/parsers/docx.ts` | pipeline | 1 |
| `src/parsers/pdf.ts` | pipeline | 1 |
| `src/parsers/xlsx.ts` | pipeline | 1 |
| `src/parsers/pptx.ts` | pipeline | 1 |
| `src/parsers/odf.ts` | pipeline | 1 |
| `src/stats.ts` | pipeline | 1 |
| `src/scc.ts` | pipeline | 1 |
| `src/progress.ts` | pipeline | 1 |
| `src/cli-validation.ts` | pipeline | 1 |
| `src/markdown/convert.ts` | content | 1 |
| `src/structure/types.ts` | content | 1 |
| `src/structure/extract.ts` | content | 1 |
| `src/structure/index.ts` | content | 1 |
| `src/inspect/shared.ts` | content | 1 |
| `src/output/tabular.ts` | output | 2 |
| `src/output/json.ts` | output | 2 |
| `src/output/tree.ts` | output | 2 |
| `src/code/types.ts` | code | 3 |
| `src/code/languages.ts` | code | 3 |
| `src/code/discover.ts` | code | 3 |
| `src/code/parsers.ts` | code | 3 |
| `src/code/build.ts` | code | 3 |
| `src/code/query.ts` | code | 3 |
| `src/code/output.ts` | code | 3 |
| `src/code/command.ts` | code | 3 |
| `src/doc/types.ts` | inspect-commands | 3 |
| `src/doc/command.ts` | inspect-commands | 3 |
| `src/doc/inspect.ts` | inspect-commands | 3 |
| `src/doc/inspect-docx.ts` | inspect-commands | 3 |
| `src/doc/inspect-pdf.ts` | inspect-commands | 3 |
| `src/doc/inspect-odt.ts` | inspect-commands | 3 |
| `src/doc/output.ts` | inspect-commands | 3 |
| `src/sheet/types.ts` | inspect-commands | 3 |
| `src/sheet/command.ts` | inspect-commands | 3 |
| `src/sheet/inspect.ts` | inspect-commands | 3 |
| `src/sheet/output.ts` | inspect-commands | 3 |
| `src/slide/types.ts` | inspect-commands | 3 |
| `src/slide/command.ts` | inspect-commands | 3 |
| `src/slide/inspect.ts` | inspect-commands | 3 |
| `src/slide/inspect-pptx.ts` | inspect-commands | 3 |
| `src/slide/inspect-odp.ts` | inspect-commands | 3 |
| `src/slide/output.ts` | inspect-commands | 3 |
| `src/table/types.ts` | inspect-commands | 3 |
| `src/table/command.ts` | inspect-commands | 3 |
| `src/table/inspect.ts` | inspect-commands | 3 |
| `src/table/inspect-docx.ts` | inspect-commands | 3 |
| `src/table/inspect-xlsx.ts` | inspect-commands | 3 |
| `src/table/inspect-pptx.ts` | inspect-commands | 3 |
| `src/table/inspect-odt.ts` | inspect-commands | 3 |
| `src/table/inspect-odp.ts` | inspect-commands | 3 |
| `src/table/output.ts` | inspect-commands | 3 |
| `src/cli.ts` | cli | 4 |

**Total: 58 files mapped** (all files in `src/`). The entry point `bin/occ.ts`
is outside `src/` and simply imports `src/cli.ts`.

## Import DAG Changes Required

`scripts/check-imports.mjs` does not exist yet. It must be created as a new
file. The script should:

1. Parse all `.ts` files in `src/` for import statements.
2. Resolve each import to its target module (directory name for files in
   subdirectories, filename for root-level files).
3. Check that every cross-module import is allowed by the `ALLOWED_DEPS` table
   above.
4. Report violations with file, line, and the disallowed dependency.
5. Exit non-zero if any violations are found.

**Planned violations to fix before the script can pass:**
- `table/inspect-xlsx.ts` → `sheet/inspect.ts` — fix via Decision D3
  (extract `getCell`, `renderCell`, `isNonEmptyCell` to `inspect/xlsx-cells.ts`)

**No other violations exist.** All current cross-module imports already conform
to the allowed dependency rules.
