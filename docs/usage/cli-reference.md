# CLI Reference

## Synopsis

```bash
occ [directories...] [options]
```

If no directories are specified, OCC scans the current working directory.

For code exploration, OCC provides a separate namespace:

```bash
occ code <find|analyze> ...
```

`occ [directories...]` and `occ code ...` are separate command families. The default scan accepts positional directories. The code exploration path uses `--path <repo-root>`.

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--by-file` / `-f` | Show a row per file instead of grouped by type | grouped by type |
| `--format <type>` | Output format: `tabular` or `json` | `tabular` |
| `--include-ext <exts>` | Comma-separated extensions to include | all supported |
| `--exclude-ext <exts>` | Comma-separated extensions to skip | none |
| `--exclude-dir <dirs>` | Directories to skip (comma-separated) | `node_modules,.git` |
| `--no-gitignore` | Disable .gitignore respect | enabled |
| `--sort <col>` | Sort by: `files`, `name`, `words`, `size` | `files` |
| `--output <file>` / `-o` | Write output to file instead of stdout | stdout |
| `--ci` | ASCII-only output, no colors | off |
| `--large-file-limit <mb>` | Skip files over this size in MB | `50` |
| `--structure` | Extract and display document heading hierarchy | off |
| `--no-code` | Skip scc code analysis | off |
| `--version` / `-V` | Print version and exit | |
| `--help` / `-h` | Print help and exit | |

## Flag Details

### `--by-file` / `-f`

Show one row per file instead of grouping by document type:

```bash
occ --by-file docs/
```

### `--format <type>`

Choose between `tabular` (default terminal tables) or `json` (machine-readable):

```bash
occ --format json docs/
```

### `--include-ext <exts>`

Only scan specific file extensions:

```bash
occ --include-ext pdf,docx docs/
```

### `--exclude-ext <exts>`

Skip specific file extensions:

```bash
occ --exclude-ext xlsx,pptx docs/
```

### `--exclude-dir <dirs>`

Skip entire directories (comma-separated):

```bash
occ --exclude-dir node_modules,.git,vendor,build docs/
```

### `--no-gitignore`

By default, OCC respects `.gitignore` rules. Use this flag to scan all files regardless:

```bash
occ --no-gitignore docs/
```

### `--sort <col>`

Sort output rows by a column. Available values: `files`, `name`, `words`, `size`:

```bash
occ --sort words docs/
```

### `--output <file>` / `-o`

Write output to a file instead of stdout:

```bash
occ --output report.txt docs/
occ --format json -o report.json docs/
```

### `--ci`

ASCII-only output with no ANSI color codes, suitable for CI pipelines:

```bash
occ --ci docs/
```

### `--large-file-limit <mb>`

Skip files exceeding the specified size in megabytes:

```bash
occ --large-file-limit 100 docs/
```

### `--structure`

Extract and display document heading hierarchy. Works with DOCX, PDF, PPTX, ODT, and ODP. Spreadsheets (XLSX, ODS) are skipped since they have no heading hierarchy.

```bash
# Tree view of headings per document
occ --structure docs/

# Structure as JSON (includes nodes with character offsets and page mappings)
occ --structure --format json docs/

# Combine with other flags
occ --structure --by-file --no-code docs/
```

The structure output runs alongside existing metrics — the metrics pipeline is untouched.

### `--no-code`

Skip the scc code analysis section entirely:

```bash
occ --no-code docs/
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (invalid arguments, scc not found, etc.) |

## Code Exploration Commands

`occ code` keeps the document-scanning command surface unchanged and adds a new on-demand code exploration flow. The strongest support path today is **JavaScript, TypeScript, and Python**.

Common behaviors across the `occ code` namespace:

- Relationship queries report `resolved`, `ambiguous`, or `unresolved` status explicitly
- `analyze deps` groups imports into `local`, `external`, and `unresolved`
- `analyze chain` can report a chain that is **blocked by ambiguity** when a path cannot continue confidently
- `occ code` builds its graph in memory on each run and does not require `scc`, a database, or a background service

### `occ code find name <name>`

Find code elements by exact name:

```bash
occ code find name UserService --path .
occ code find name bootstrap --path . --type function
occ code find name duplicate --path test/fixtures/code-explore --file src/duplicate-a.ts
```

Use `--file` when the same symbol name exists in multiple files.

### `occ code find pattern <text>`

Case-insensitive substring search across symbol names:

```bash
occ code find pattern service --path .
```

### `occ code find type <type>`

List all nodes of a given type (`file`, `module`, `function`, `class`, `variable`):

```bash
occ code find type function --path .
```

### `occ code find content <text>`

Case-insensitive source-text search:

```bash
occ code find content normalize_name --path .
```

### `occ code analyze calls <function>`

Show what a function calls. Receiver-aware resolution is supported for `this`, `super`, `self`, and `cls`, and ambiguous calls include candidate hints:

```bash
occ code analyze calls bootstrap --path .
occ code analyze calls ambiguousCaller --path test/fixtures/code-explore
```

### `occ code analyze callers <function>`

Show what calls a function:

```bash
occ code analyze callers createUser --path .
```

### `occ code analyze chain <from> <to>`

Find a call path between two functions. If OCC only finds a path in the opposite direction, it labels the result as a reverse path. When OCC cannot continue because the next hop is ambiguous, it reports a blocked chain instead of silently returning nothing:

```bash
occ code analyze chain bootstrap formatName --path . --depth 5
occ code analyze chain ambiguousCaller duplicate --path test/fixtures/code-explore
```

### `occ code analyze deps <target>`

Inspect imports around a file or module. Output is grouped into local modules, external packages, and unresolved imports:

```bash
occ code analyze deps src/service --path .
occ code analyze deps src/deps --path test/fixtures/code-explore
occ code analyze deps python/deps --path test/fixtures/code-explore
```

### `occ code analyze tree <class>`

Inspect inheritance for a class:

```bash
occ code analyze tree UserService --path .
```

### Shared `occ code` Options

| Flag | Description | Default |
|------|-------------|---------|
| `--path <repo-root>` | Repository root to analyze | current directory |
| `--format <type>` | `tabular` or `json` | `tabular` |
| `--file <path>` | Narrow symbol resolution to one file where supported | none |
| `--limit <n>` | Max search results | `50` |
| `--depth <n>` | Max call-chain depth | `5` |
| `--exclude-dir <dirs>` | Directories to skip | `node_modules,.git,dist,vendor,build,coverage,target` |
| `--no-gitignore` | Disable `.gitignore` respect | enabled |
| `--ci` | ASCII-only output | off |
| `--output <file>` | Write output to file | stdout |

`--file` is currently supported on `find name`, `analyze calls`, `analyze callers`, and `analyze tree`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SCC_SKIP_DOWNLOAD` | Set to `1` to skip automatic scc binary download during `npm install` |
