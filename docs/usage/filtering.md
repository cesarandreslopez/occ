# Filtering

OCC has two filtering models:

- the default `occ [directories...]` scan flow, which filters document discovery
- the `occ code` flow, which filters repository code discovery

Some flags overlap, but they are not identical.

## Extension Filtering

### Include Specific Extensions

Use `--include-ext` to scan only specific file types:

```bash
# Only PDF and Word files
occ --include-ext pdf,docx docs/

# Only spreadsheets
occ --include-ext xlsx,ods docs/
```

### Exclude Specific Extensions

Use `--exclude-ext` to skip specific file types:

```bash
# Skip Excel files
occ --exclude-ext xlsx docs/

# Skip all presentation formats
occ --exclude-ext pptx,odp docs/
```

!!! note
    `--include-ext` and `--exclude-ext` can be combined. When both are specified, inclusions are applied first, then exclusions are removed from that set.

## Directory Exclusion

Use `--exclude-dir` to skip entire directories (comma-separated):

```bash
# Default exclusions
occ docs/   # already skips node_modules and .git

# Add more exclusions
occ --exclude-dir node_modules,.git,vendor,build,dist docs/
```

The default excluded directories are `node_modules` and `.git`. Specifying `--exclude-dir` replaces the defaults, so include them if you still want them excluded.

## .gitignore Integration

By default, OCC respects `.gitignore` rules — files matched by your `.gitignore` patterns are skipped during file discovery.

To disable this behavior and scan all files:

```bash
occ --no-gitignore docs/
```

## Large File Limit

Files exceeding a size threshold are automatically skipped. The default limit is 50 MB.

```bash
# Increase to 100 MB
occ --large-file-limit 100 docs/

# Lower to 10 MB
occ --large-file-limit 10 docs/
```

When files are skipped, OCC reports the count at the bottom of the output:

```
3 file(s) skipped (use --large-file-limit to adjust)
```

## `occ code` Filtering

`occ code` does not use `--include-ext`, `--exclude-ext`, or `--large-file-limit`. Instead, it discovers supported code files under the repo root selected by `--path`.

The code exploration commands do support:

- `--exclude-dir` to skip directories like `dist`, `coverage`, or generated code
- `--no-gitignore` to disable `.gitignore` filtering

Example:

```bash
occ code find pattern service --path . --exclude-dir node_modules,.git,dist,coverage
```

This distinction matters when you are comparing the two command families: the default scan is document-format oriented, while `occ code` is repository-root oriented.
