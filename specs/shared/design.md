# shared — Design Spec

## Purpose

Foundation types and pure utility functions with zero internal dependencies,
used by every other module in the codebase.

## Public Interface

Exports from `src/types.ts`:
- `FileEntrySchema`, `FileEntry`
- `SkippedEntrySchema`, `SkippedEntry`
- `ParserOutputSchema`, `ParserOutput`
- `ParseResultSchema`, `ParseResult`

Exports from `src/utils.ts`:
- `countWords(text: string): number`
- `formatBytes(bytes: number): string`
- `formatNumber(n: number | null | undefined): string`
- `getExtension(filePath: string): string`
- `hasKey(field: string): string`
- `writeStream(stream: NodeJS.WritableStream, text: string): Promise<void>`
- `EXTENSION_TO_TYPE: Record<string, string>`
- `OFFICE_EXTENSIONS: string[]`
- `METRIC_FIELDS: readonly [...]`
- `MetricFieldSchema`, `MetricField`

## Internal Structure

```
src/
├── types.ts             — Shared data types (FileEntry, ParseResult, etc.)
├── utils.ts             — Pure utility functions and constants
└── @types/
    ├── mammoth.d.ts     — mammoth module type declarations
    └── pdf-parse.d.ts   — pdf-parse module type declarations
```

## Dependencies

- **Allowed imports:** `zod`, `node:path` (external only)
- **Forbidden imports:** Any file in `src/` (this is the foundation layer)

## Files to Move

| Source (current) | Destination (target) | Notes |
|-----------------|---------------------|-------|
| — | — | No files move. All files stay in place. |

## Open Questions

- None. This module is stable and well-defined.
