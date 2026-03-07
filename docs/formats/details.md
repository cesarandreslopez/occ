# Format Details

Detailed breakdown of how OCC extracts metrics from each format.

## Word (.docx)

**Parser:** [mammoth](https://www.npmjs.com/package/mammoth)

**Metrics extracted:**

- **Words** — raw text extracted via `mammoth.extractRawText()`, then split on whitespace
- **Pages** — estimated at 250 words per page (`Math.max(1, Math.ceil(words / 250))`)
- **Paragraphs** — text split on double newlines, filtered for non-empty segments

!!! note "Page estimation"
    DOCX files don't store reliable page counts. OCC estimates pages at 250 words per page, which is a standard publishing convention.

## PDF (.pdf)

**Parser:** [pdf-parse](https://www.npmjs.com/package/pdf-parse)

**Metrics extracted:**

- **Words** — text extracted by pdf-parse, then split on whitespace
- **Pages** — actual page count from the PDF metadata (`data.numpages`)

PDF is the only format that provides a true page count rather than an estimate.

## Excel (.xlsx)

**Parser:** [ExcelJS](https://www.npmjs.com/package/exceljs)

**Metrics extracted:**

- **Sheets** — `workbook.worksheets.length`
- **Rows** — sum of `worksheet.actualRowCount` across all sheets
- **Cells** — counted by iterating every cell in every row across all sheets

Word and page counts are not extracted from spreadsheets.

## PowerPoint (.pptx)

**Parser:** [JSZip](https://www.npmjs.com/package/jszip) + [officeparser](https://www.npmjs.com/package/officeparser)

**Metrics extracted:**

- **Words** — text extracted via officeparser, then split on whitespace
- **Slides** — counted by inspecting the ZIP structure for `ppt/slides/slideN.xml` entries

## ODT (OpenDocument Text)

**Parser:** [officeparser](https://www.npmjs.com/package/officeparser)

**Metrics extracted:**

- **Words** — text extracted via officeparser, then split on whitespace
- **Pages** — estimated at 250 words per page (same as Word)
- **Paragraphs** — text split on newlines, filtered for non-empty segments

## ODS (OpenDocument Spreadsheet)

**Parser:** [JSZip](https://www.npmjs.com/package/jszip) + [officeparser](https://www.npmjs.com/package/officeparser)

**Metrics extracted:**

- **Sheets** — counted by matching `<table:table` elements in `content.xml`
- **Rows** — counted by matching `<table:table-row` elements in `content.xml`
- **Cells** — counted from officeparser text output (non-empty lines)

## ODP (OpenDocument Presentation)

**Parser:** [JSZip](https://www.npmjs.com/package/jszip) + [officeparser](https://www.npmjs.com/package/officeparser)

**Metrics extracted:**

- **Words** — text extracted via officeparser, then split on whitespace
- **Slides** — counted by matching `<draw:page` elements in `content.xml`
