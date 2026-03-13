import mammoth from 'mammoth';
import { estimateTokens } from '../inspect/shared.js';
import type { ExtractedTable, InspectTableOptions, TableCell } from './types.js';

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function extractAttribute(tag: string, attr: string): number | undefined {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*"(\\d+)"`, 'i'));
  if (match) {
    const val = parseInt(match[1], 10);
    return val > 1 ? val : undefined;
  }
  return undefined;
}

function detectHeaders(firstRowCells: TableCell[], firstRowTags: string[], options: InspectTableOptions): string[] | null {
  if (options.headerRow === 'none') return null;

  // If explicit row number, it must be 1 (first row) for us to use it
  if (typeof options.headerRow === 'number') {
    if (options.headerRow === 1) {
      return firstRowCells.map(c => c.value);
    }
    return null;
  }

  // Auto mode: use if all cells in first row are <th>
  const allTh = firstRowTags.every(tag => /^<th\b/i.test(tag));
  if (allTh) {
    return firstRowCells.map(c => c.value);
  }

  // Heuristic: if all values are non-empty unique strings
  const values = firstRowCells.map(c => c.value).filter(v => v.length > 0);
  if (values.length > 0 && values.length === firstRowCells.length && new Set(values).size === values.length) {
    return firstRowCells.map(c => c.value);
  }

  return null;
}

export async function extractDocxTables(filePath: string, options: InspectTableOptions): Promise<ExtractedTable[]> {
  const htmlResult = await mammoth.convertToHtml({ path: filePath });
  const html = htmlResult.value || '';

  const tableMatches = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  if (tableMatches.length === 0) return [];

  const tables: ExtractedTable[] = [];

  for (let ti = 0; ti < tableMatches.length; ti++) {
    const tableHtml = tableMatches[ti][1];
    const rowMatches = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rowMatches.length === 0) continue;

    const allRows: { cells: TableCell[]; tags: string[] }[] = [];

    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[1];
      const cellMatches = [...rowHtml.matchAll(/<(t[dh])\b([^>]*)>([\s\S]*?)<\/\1>/gi)];
      const cells: TableCell[] = [];
      const tags: string[] = [];

      for (const cellMatch of cellMatches) {
        const tagName = cellMatch[1];
        const attrs = cellMatch[2];
        const content = stripHtmlTags(cellMatch[3]);
        const cell: TableCell = { value: content };
        const colSpan = extractAttribute(attrs, 'colspan');
        const rowSpan = extractAttribute(attrs, 'rowspan');
        if (colSpan) cell.colSpan = colSpan;
        if (rowSpan) cell.rowSpan = rowSpan;
        cells.push(cell);
        tags.push(`<${tagName}${attrs}>`);
      }

      allRows.push({ cells, tags });
    }

    if (allRows.length === 0) continue;

    // Detect headers
    const headers = detectHeaders(allRows[0].cells, allRows[0].tags, options);
    const dataStartIndex = headers ? 1 : 0;

    // Build rows with sample limit
    const maxRows = options.sampleRows;
    const dataRows = allRows.slice(dataStartIndex);
    const truncated = dataRows.length > maxRows;
    const limitedRows = dataRows.slice(0, maxRows);

    const rows = limitedRows.map((row, idx) => ({
      index: dataStartIndex + idx + 1,
      cells: row.cells,
    }));

    const columnCount = Math.max(...allRows.map(r => r.cells.length), 0);
    const cellCount = allRows.reduce((sum, r) => sum + r.cells.length, 0);

    // Token estimate
    let chars = 0;
    for (const row of allRows) {
      for (const cell of row.cells) {
        chars += cell.value.length + 1;
      }
      chars += 1;
    }

    tables.push({
      tableIndex: ti + 1,
      location: null,
      rowCount: allRows.length,
      columnCount,
      cellCount,
      headers,
      rows,
      truncated,
      tokenEstimate: estimateTokens(chars),
    });
  }

  return tables;
}
