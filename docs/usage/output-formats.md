# Output Formats

OCC supports two output formats: tabular (default) and JSON.

## Tabular Output (Default)

The default output renders two cli-table3 tables: one for documents and one for code.

```bash
occ docs/
```

```
-- Documents ---------------------------------------------------------------
  Format    Files    Words    Pages                  Details      Size
----------------------------------------------------------------------------
  Word         12   34,210      137              1,203 paras    1.2 MB
  PDF           8   22,540       64                             4.5 MB
  Excel         3                                12 sheets      890 KB
----------------------------------------------------------------------------
  Total        23   56,750      201              1,203 paras    6.5 MB

-- Code (via scc) ----------------------------------------------------------
  Language    Files    Lines   Blanks  Comments     Code
----------------------------------------------------------------------------
  JavaScript     15     2340      180       320     1840
----------------------------------------------------------------------------
  Total          15     2340      180       320     1840

Scanned 23 documents (56,750 words, 201 pages) in 120ms
```

Columns are auto-detected based on which metrics have data. For example, the "Details" column combines paragraphs, sheets, rows, cells, and slides — only appearing when at least one format produces those metrics.

## JSON Output

Use `--format json` for machine-readable output:

```bash
occ --format json docs/
```

```json
{
  "documents": {
    "files": [
      {
        "type": "Word",
        "count": 12,
        "words": 34210,
        "pages": 137,
        "paragraphs": 1203,
        "sheets": 0,
        "rows": 0,
        "cells": 0,
        "slides": 0,
        "size": 1258291
      }
    ],
    "totals": {
      "files": 23,
      "words": 56750,
      "pages": 201,
      "paragraphs": 1203,
      "sheets": 12,
      "rows": 450,
      "cells": 5400,
      "slides": 0,
      "size": 6815744
    }
  },
  "code": [
    {
      "Name": "JavaScript",
      "Count": 15,
      "Lines": 2340,
      "Blank": 180,
      "Comment": 320,
      "Code": 1840
    }
  ]
}
```

The `documents` section always contains `files` (array of per-type or per-file entries) and `totals`. The `code` section is the raw scc JSON output, only present when code files are found.

## By-File Mode

Use `--by-file` / `-f` to show one row per file instead of grouping by type:

```bash
occ --by-file docs/
```

```
-- Documents ---------------------------------------------------------------
  File              Words    Pages              Details      Size
----------------------------------------------------------------------------
  report.docx       5,200       21             82 paras      45 KB
  spec.pdf          3,100       12                          1.2 MB
  data.xlsx                                    3 sheets     890 KB
----------------------------------------------------------------------------
  Total (3 files)   8,300       33             82 paras     2.1 MB
```

In JSON mode with `--by-file`, each file entry includes `name` and `path` fields:

```bash
occ --format json --by-file docs/
```

## File Output

Use `--output` / `-o` to write output to a file instead of stdout:

```bash
# Tabular to file
occ --output report.txt docs/

# JSON to file
occ --format json -o report.json docs/
```
