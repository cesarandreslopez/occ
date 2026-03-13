import JSZip from 'jszip';
import { estimateTokens } from '../inspect/shared.js';
import type { ExtractedTable, InspectTableOptions, TableCell } from './types.js';

function extractCellText(tcXml: string): string {
  const matches = tcXml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
  return matches.map(m => {
    const text = m.match(/<a:t>([^<]*)<\/a:t>/);
    return text?.[1] || '';
  }).join(' ').trim();
}

function extractIntAttribute(xml: string, attr: string): number | undefined {
  const match = xml.match(new RegExp(`${attr}\\s*=\\s*"(\\d+)"`, 'i'));
  if (match) {
    const val = parseInt(match[1], 10);
    return val > 1 ? val : undefined;
  }
  return undefined;
}

function detectHeaders(firstRowCells: TableCell[], options: InspectTableOptions): string[] | null {
  if (options.headerRow === 'none') return null;

  if (typeof options.headerRow === 'number' && options.headerRow === 1) {
    return firstRowCells.map(c => c.value);
  }

  if (options.headerRow === 'auto') {
    const values = firstRowCells.map(c => c.value).filter(v => v.length > 0);
    if (values.length > 0 && values.length === firstRowCells.length && new Set(values).size === values.length) {
      return firstRowCells.map(c => c.value);
    }
  }

  return null;
}

export async function extractPptxTables(buffer: Buffer, options: InspectTableOptions): Promise<ExtractedTable[]> {
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

  const tables: ExtractedTable[] = [];
  let tableIndex = 0;

  for (let si = 0; si < slideFiles.length; si++) {
    const slideXml = await zip.file(slideFiles[si])?.async('text');
    if (!slideXml) continue;

    // Find all <a:tbl> elements
    const tableMatches = [...slideXml.matchAll(/<a:tbl\b[^>]*>([\s\S]*?)<\/a:tbl>/gi)];

    for (const tableMatch of tableMatches) {
      tableIndex++;
      const tableXml = tableMatch[1];

      // Find rows
      const rowMatches = [...tableXml.matchAll(/<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/gi)];
      if (rowMatches.length === 0) continue;

      const allRows: TableCell[][] = [];

      for (const rowMatch of rowMatches) {
        const rowXml = rowMatch[1];
        const cellMatches = [...rowXml.matchAll(/<a:tc\b([^>]*?)>([\s\S]*?)<\/a:tc>/gi)];
        const cells: TableCell[] = [];

        for (const cellMatch of cellMatches) {
          const attrs = cellMatch[1];
          const cellXml = cellMatch[2];
          const value = extractCellText(cellXml);
          const cell: TableCell = { value };

          const gridSpan = extractIntAttribute(attrs, 'gridSpan');
          const rowSpan = extractIntAttribute(attrs, 'rowSpan');
          if (gridSpan) cell.colSpan = gridSpan;
          if (rowSpan) cell.rowSpan = rowSpan;

          cells.push(cell);
        }

        allRows.push(cells);
      }

      if (allRows.length === 0) continue;

      // Detect headers
      const headers = detectHeaders(allRows[0], options);
      const dataStartIndex = headers ? 1 : 0;

      const dataRows = allRows.slice(dataStartIndex);
      const truncated = dataRows.length > options.sampleRows;
      const limitedRows = dataRows.slice(0, options.sampleRows);

      const rows = limitedRows.map((cells, idx) => ({
        index: dataStartIndex + idx + 1,
        cells,
      }));

      const columnCount = Math.max(...allRows.map(r => r.length), 0);
      const cellCount = allRows.reduce((sum, r) => sum + r.length, 0);

      let chars = 0;
      for (const row of allRows) {
        for (const cell of row) {
          chars += cell.value.length + 1;
        }
        chars += 1;
      }

      tables.push({
        tableIndex,
        location: `Slide ${si + 1}`,
        rowCount: allRows.length,
        columnCount,
        cellCount,
        headers,
        rows,
        truncated,
        tokenEstimate: estimateTokens(chars),
      });
    }
  }

  return tables;
}
