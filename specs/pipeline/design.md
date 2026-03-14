# pipeline — Design Spec

## Purpose

Core document scanning pipeline — file discovery, document parsing, aggregation,
scc code metrics integration, progress reporting, and CLI option validation.

## Public Interface

Exports from `src/walker.ts`:
- `findFiles(directories, options): Promise<FindFilesResult>`
- `FindFilesOptionsSchema`, `FindFilesOptions`
- `FindFilesResultSchema`, `FindFilesResult`

Exports from `src/parsers/index.ts`:
- `parseFiles(files, concurrency, onProgress): Promise<ParseResult[]>`
- `parseFile(filePath, size): Promise<ParseResult>`
- `ProgressCallback` type

Exports from `src/stats.ts`:
- `aggregate(results, options): AggregateResult`
- `StatsRow`, `ColumnVisibility`, `AggregateResult` interfaces
- `AggregateOptionsSchema`, `AggregateOptions`

Exports from `src/scc.ts`:
- `checkScc(): Promise<string>`
- `runScc(sccBinary, directories, options): Promise<SccLanguage[]>`
- `SccLanguageSchema`, `SccLanguage`
- `SccFileSchema`, `SccFile`
- `RunSccOptionsSchema`, `RunSccOptions`

Exports from `src/progress.ts`:
- `createProgress(options): ProgressBar`
- `ProgressBar` interface
- `ProgressOptionsSchema`, `ProgressOptions`

Exports from `src/cli-validation.ts`:
- `parsePositiveInt(value, fallback, label): number`
- `parseHeaderRow(value): HeaderRowValue`
- `validateLargeFileLimit(value): number`
- `PositiveIntSchema`, `HeaderRowSchema`, `HeaderRowValue`
- `PositiveNumberSchema`

## Internal Structure

```
src/
├── walker.ts            — File discovery via fast-glob
├── parsers/
│   ├── index.ts         — Parser router + batch processor
│   ├── docx.ts          — DOCX parser (mammoth)
│   ├── pdf.ts           — PDF parser (pdf-parse)
│   ├── xlsx.ts          — XLSX parser (SheetJS)
│   ├── pptx.ts          — PPTX parser (JSZip + officeparser)
│   └── odf.ts           — ODF parser (JSZip + officeparser)
├── stats.ts             — Aggregation, sorting, column detection
├── scc.ts               — scc binary discovery + invocation
├── progress.ts          — Terminal progress bar
└── cli-validation.ts    — CLI option validation schemas
```

## Dependencies

- **Allowed imports:** `shared` (`types.ts`, `utils.ts`)
- **Forbidden imports:** `content`, `output`, `code`, `inspect-commands`, `cli`

## Files to Move

| Source (current) | Destination (target) | Notes |
|-----------------|---------------------|-------|
| — | — | No files move. All files stay in place. |

## Open Questions

- `cli-validation.ts` could arguably belong to a separate "cli-support" module,
  but it has zero internal deps and is small (63 lines). Keeping it in pipeline
  avoids creating a module for a single utility file.
