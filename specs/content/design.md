# content — Design Spec

## Purpose

Document content transformation and shared inspection utilities — markdown
conversion from office documents, hierarchical structure extraction from
markdown, and common helpers for document inspection commands.

## Public Interface

Exports from `src/markdown/convert.ts`:
- `documentToMarkdown(filePath: string): Promise<string | null>`

Exports from `src/structure/index.ts` (barrel):
- `extractFromMarkdown(content: string): DocumentStructure`
- `findChunkSection(structure, start, end): StructureNode | null`
- `getSectionContent(content, node, includeChildren?): string`
- `StructureNode`, `DocumentStructure`, `PageMapping` types
- `flatten`, `getNodeById`, `getNodeByPath`, `toDict`, `fromDict` utilities

Exports from `src/structure/types.ts`:
- `StructureNodeSchema`, `DocumentStructureSchema`, `PageMappingSchema`

Exports from `src/inspect/shared.ts`:
- `DocumentPropertiesSchema`, `DocumentProperties`
- `estimateTokens(input: string | number): number`
- `asOptionalString(value: unknown): string | undefined`
- `formatDateLike(value: unknown): string | undefined`
- `createInspectPayload<T>(file, query, results): { file, query, results }`

**New file (planned — Decision D3):**

Exports from `src/inspect/xlsx-cells.ts` (to be extracted from `sheet/inspect.ts`):
- `getCell(sheet, row, col): CellObject | undefined`
- `renderCell(cell): string`
- `isNonEmptyCell(cell): boolean`

## Internal Structure

```
src/
├── markdown/
│   └── convert.ts       — Document → markdown (DOCX, PDF, PPTX, ODT, ODP)
├── structure/
│   ├── types.ts         — StructureNode, DocumentStructure, PageMapping + utilities
│   ├── extract.ts       — Header extraction, tree building, page mapping
│   └── index.ts         — Barrel re-exports
└── inspect/
    ├── shared.ts        — DocumentProperties, estimateTokens, createInspectPayload
    └── xlsx-cells.ts    — (planned) XLSX cell utilities extracted from sheet/inspect.ts
```

## Dependencies

- **Allowed imports:** `shared` (`utils.ts`)
- **Forbidden imports:** `pipeline`, `output`, `code`, `inspect-commands`, `cli`

## Files to Move

| Source (current) | Destination (target) | Notes |
|-----------------|---------------------|-------|
| — | — | No existing files move. |
| `sheet/inspect.ts` lines 451-476 | `inspect/xlsx-cells.ts` (new) | Extract `getCell`, `renderCell`, `isNonEmptyCell` |

## Open Questions

- The extraction of xlsx-cells.ts is a small, low-risk change (~25 lines).
  It will be done in a dedicated PR with tests.
