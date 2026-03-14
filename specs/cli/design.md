# cli — Design Spec

## Purpose

Top-level CLI orchestrator — defines the Commander.js program, registers all
subcommands, and implements the main scanning pipeline (find files → parse →
aggregate → format → output).

## Public Interface

Exports from `src/cli.ts`:
- `run(argv: string[]): Promise<void>`

## Internal Structure

```
src/
└── cli.ts   — Commander.js program, execute() pipeline (231 lines)

bin/
└── occ.ts   — Entry point (3 lines: imports run() and calls it)
```

## Dependencies

- **Allowed imports:** All modules (this is the top-level orchestrator)
- **Forbidden imports:** None (Layer 4 can import anything)

Specific imports:
- `shared`: `types.ts` (ParseResult, FileEntry), `utils.ts` (getExtension, writeStream)
- `pipeline`: `walker.ts` (findFiles), `parsers/index.ts` (parseFiles),
  `stats.ts` (aggregate), `scc.ts` (checkScc, runScc, SccLanguage),
  `progress.ts` (createProgress), `cli-validation.ts` (validateLargeFileLimit)
- `content`: `markdown/convert.ts` (documentToMarkdown),
  `structure/index.ts` (extractFromMarkdown)
- `output`: `output/tabular.ts` (formatDocumentTable, formatSccTable, formatSummaryLine),
  `output/json.ts` (formatJson), `output/tree.ts` (formatStructureTree, formatStructureJson, StructureResult)
- `code`: `code/command.ts` (registerCodeCommands)
- `inspect-commands`: `doc/command.ts`, `sheet/command.ts`,
  `slide/command.ts`, `table/command.ts` (registerXxxCommands)

## Files to Move

| Source (current) | Destination (target) | Notes |
|-----------------|---------------------|-------|
| — | — | No files move. |

## Open Questions

- `cli.ts` has 26 imports (highest fan-out). This is expected for an
  orchestrator. The fan-out is a consequence of the flat import style (no
  barrel files), not a design problem.
- The `extractStructures` helper function (lines 98-125) could potentially
  be extracted to the `content` module, but it combines markdown conversion
  with structure extraction in a pipeline-specific way. Keeping it in cli.ts
  is pragmatic.
