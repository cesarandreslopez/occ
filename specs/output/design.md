# output — Design Spec

## Purpose

Format scan results for terminal display and JSON output. Provides tabular
tables (cli-table3), JSON serialization, and structure tree rendering for the
main `occ` scan pipeline.

## Public Interface

Exports from `src/output/tabular.ts`:
- `formatDocumentTable(stats, options?): string`
- `formatSccTable(sccData, options?): string`
- `formatSummaryLine(stats, sccData, elapsed, options?): string`
- `sectionHeader(title, width, ci?): string`
- `stripAnsi(str: string): string`
- `tableChars(ci: boolean): Record<string, string>`
- `TableOptionsSchema`, `TableOptions`

Exports from `src/output/json.ts`:
- `formatJson(stats, sccData?, structureResults?): string`

Exports from `src/output/tree.ts`:
- `formatStructureTree(result, options?): string`
- `formatStructureJson(results): Record<string, unknown>[]`
- `StructureResultSchema`, `StructureResult`
- `TreeOptionsSchema`, `TreeOptions`

## Internal Structure

```
src/output/
├── tabular.ts   — cli-table3 terminal tables, section headers, color schemes
├── json.ts      — JSON output for scan results
└── tree.ts      — Structure tree rendering (file → heading tree with pages)
```

## Dependencies

- **Allowed imports:** `shared` (`utils.ts`), `pipeline` (`stats.ts`, `scc.ts`),
  `content` (`structure/types.ts`)
- **Forbidden imports:** `code`, `inspect-commands`, `cli`

Specific cross-module imports:
- `output/tabular.ts` → `utils.ts` (formatBytes, formatNumber)
- `output/tabular.ts` → `stats.ts` (AggregateResult, StatsRow types)
- `output/tabular.ts` → `scc.ts` (SccLanguage type)
- `output/json.ts` → `utils.ts`, `stats.ts`, `scc.ts`, `output/tree.ts`
- `output/tree.ts` → `output/tabular.ts` (sectionHeader, stripAnsi, tableChars)
- `output/tree.ts` → `structure/types.ts` (StructureNode, DocumentStructure)

## Files to Move

| Source (current) | Destination (target) | Notes |
|-----------------|---------------------|-------|
| — | — | No files move. |

## Open Questions

- `output/tree.ts` imports from `output/tabular.ts` — this is an intra-module
  dependency and is fine.
- `StructureResult` type lives in `output/tree.ts` rather than in `structure/`.
  This is intentional (Decision D6) since it serves the output concern and
  moving it would create a circular import.
