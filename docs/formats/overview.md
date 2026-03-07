# Supported Formats

OCC supports seven office document formats across three categories.

## Format Summary

| Format | Extension | Words | Pages | Paragraphs | Sheets | Rows | Cells | Slides | Parser Library |
|--------|-----------|:-----:|:-----:|:----------:|:------:|:----:|:-----:|:------:|---------------|
| Word | `.docx` | Yes | Yes* | Yes | | | | | mammoth |
| PDF | `.pdf` | Yes | Yes | | | | | | pdf-parse |
| Excel | `.xlsx` | | | | Yes | Yes | Yes | | ExcelJS |
| PowerPoint | `.pptx` | Yes | | | | | | Yes | JSZip + officeparser |
| ODT | `.odt` | Yes | Yes* | Yes | | | | | officeparser |
| ODS | `.ods` | | | | Yes | Yes | Yes | | JSZip + officeparser |
| ODP | `.odp` | Yes | | | | | | Yes | JSZip + officeparser |

\* Pages for Word (.docx) and ODT (.odt) are estimated at 250 words per page.

## Categories

### Text Documents

**Word (.docx)** and **ODT (.odt)** — extract word counts, page estimates, and paragraph counts.

### Spreadsheets

**Excel (.xlsx)** and **ODS (.ods)** — extract sheet counts, row counts, and cell counts. Word counts are not applicable.

### Presentations

**PowerPoint (.pptx)** and **ODP (.odp)** — extract word counts and slide counts from presentation text content.

### PDF

**PDF (.pdf)** — extracts word counts and actual page counts (not estimated).
