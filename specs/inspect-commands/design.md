# inspect-commands — Design Spec

## Purpose

Domain-specific document inspection commands — deep inspection of DOCX, PDF,
ODT, XLSX, PPTX, ODP files via the `occ doc|sheet|slide|table` subcommand
families. Each sub-domain follows the same pattern: `types.ts`, `command.ts`,
`inspect.ts` (+ format-specific inspectors), `output.ts`.

## Public Interface

Exports from `src/doc/command.ts`:
- `registerDocCommands(program: Command): void`

Exports from `src/sheet/command.ts`:
- `registerSheetCommands(program: Command): void`

Exports from `src/slide/command.ts`:
- `registerSlideCommands(program: Command): void`

Exports from `src/table/command.ts`:
- `registerTableCommands(program: Command): void`

All other exports are module-internal (consumed only within their sub-domain,
except for the cross-domain dependency noted below).

## Internal Structure

```
src/
├── doc/
│   ├── types.ts           — DocRiskFlags, ContentStats, StructureSummary, etc.
│   ├── command.ts         — CLI registration for `occ doc inspect`
│   ├── inspect.ts         — Format router → inspect-docx/pdf/odt
│   ├── inspect-docx.ts    — DOCX inspection (mammoth)
│   ├── inspect-pdf.ts     — PDF inspection (pdf-parse)
│   ├── inspect-odt.ts     — ODT inspection (JSZip + officeparser)
│   └── output.ts          — Doc inspection formatters
├── sheet/
│   ├── types.ts           — SheetProfile, WorkbookInspection, ColumnProfile, etc.
│   ├── command.ts         — CLI registration for `occ sheet inspect`
│   ├── inspect.ts         — XLSX workbook/sheet profiling (528 lines)
│   └── output.ts          — Sheet inspection formatters
├── slide/
│   ├── types.ts           — SlideProfile, PresentationInspection, etc.
│   ├── command.ts         — CLI registration for `occ slide inspect`
│   ├── inspect.ts         — Format router → inspect-pptx/odp
│   ├── inspect-pptx.ts    — PPTX inspection (JSZip)
│   ├── inspect-odp.ts     — ODP inspection (JSZip)
│   └── output.ts          — Slide inspection formatters
└── table/
    ├── types.ts           — ExtractedTable, TableCell, etc.
    ├── command.ts         — CLI registration for `occ table inspect`
    ├── inspect.ts         — Format router → inspect-docx/xlsx/pptx/odt/odp
    ├── inspect-docx.ts    — DOCX table extraction (mammoth HTML)
    ├── inspect-xlsx.ts    — XLSX table extraction (SheetJS)
    ├── inspect-pptx.ts    — PPTX table extraction (slide XML)
    ├── inspect-odt.ts     — ODT table extraction (content.xml)
    ├── inspect-odp.ts     — ODP table extraction (content.xml)
    └── output.ts          — Table inspection formatters
```

## Dependencies

- **Allowed imports:** `shared` (`utils.ts`), `pipeline` (`cli-validation.ts`),
  `content` (`inspect/shared.ts`, `structure/`, `markdown/`), `output` (`output/tabular.ts`)
- **Forbidden imports:** `code`, `cli`
- **Internal cross-dep:** `table/inspect-xlsx.ts` → `sheet/inspect.ts`
  (to be resolved — see below)

Specific cross-module imports per sub-domain:

**doc/**
- `doc/types.ts` → `inspect/shared.ts` (DocumentPropertiesSchema), `structure/types.ts` (StructureNodeSchema)
- `doc/inspect.ts` → `inspect/shared.ts`, `markdown/convert.ts`, `structure/index.ts`, `utils.ts`
- `doc/inspect-*.ts` → `doc/types.ts`, `inspect/shared.ts`, `utils.ts`
- `doc/command.ts` → `cli-validation.ts`, `inspect/shared.ts`, `utils.ts`
- `doc/output.ts` → `output/tabular.ts`, `utils.ts`

**sheet/**
- `sheet/inspect.ts` → `inspect/shared.ts`
- `sheet/command.ts` → `cli-validation.ts`, `utils.ts`
- `sheet/output.ts` → `output/tabular.ts`, `utils.ts`

**slide/**
- `slide/types.ts` → `inspect/shared.ts` (DocumentPropertiesSchema)
- `slide/inspect*.ts` → `inspect/shared.ts`, `utils.ts`
- `slide/command.ts` → `cli-validation.ts`, `inspect/shared.ts`, `utils.ts`
- `slide/output.ts` → `output/tabular.ts`, `utils.ts`

**table/**
- `table/inspect-xlsx.ts` → `sheet/inspect.ts` (getCell, renderCell, isNonEmptyCell) — **to be resolved**
- `table/inspect-*.ts` → `inspect/shared.ts`
- `table/command.ts` → `cli-validation.ts`, `inspect/shared.ts`, `utils.ts`
- `table/output.ts` → `output/tabular.ts`, `utils.ts`

## Cross-Domain Dependency Resolution

**Current:** `table/inspect-xlsx.ts` imports `getCell`, `renderCell`,
`isNonEmptyCell` from `sheet/inspect.ts`.

**Resolution:** Extract these 3 functions (~25 lines) into
`src/inspect/xlsx-cells.ts` (content module, Layer 1). Update both
`sheet/inspect.ts` and `table/inspect-xlsx.ts` to import from the new location.

**Impact:**
- `sheet/inspect.ts`: Replace 3 function definitions with imports
- `table/inspect-xlsx.ts`: Change import path from `../sheet/inspect.js` to `../inspect/xlsx-cells.js`
- New file: `src/inspect/xlsx-cells.ts` (~25 lines)

## Files to Move

| Source (current) | Destination (target) | Notes |
|-----------------|---------------------|-------|
| `sheet/inspect.ts` lines 451-476 | `inspect/xlsx-cells.ts` (new) | Extract `getCell`, `renderCell`, `isNonEmptyCell` |

## Open Questions

- `sheet/inspect.ts` is 528 lines (2nd largest file). It could be split into
  workbook-level and sheet-level inspection in a future phase. This is an
  intra-module concern.
- `table/` has no dedicated tests. Adding tests for table inspection should
  be prioritized before major refactoring of that sub-domain.
