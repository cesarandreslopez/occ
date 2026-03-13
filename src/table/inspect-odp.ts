import JSZip from 'jszip';
import { estimateTokens } from '../inspect/shared.js';
import type { ExtractedTable, InspectTableOptions, TableCell } from './types.js';

function stripXmlTags(xml: string): string {
  return xml.replace(/<[^>]*>/g, '').trim();
}

function extractIntAttribute(tag: string, attr: string): number | undefined {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*"(\\d+)"`, 'i'));
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

export async function extractOdpTables(buffer: Buffer, options: InspectTableOptions): Promise<ExtractedTable[]> {
  const zip = await JSZip.loadAsync(buffer);
  const contentXml = await zip.file('content.xml')?.async('text');
  if (!contentXml) return [];

  // Split by draw:page to get slide context
  const pageMatches = [...contentXml.matchAll(/<draw:page\b([^>]*)>([\s\S]*?)<\/draw:page>/gi)];

  const tables: ExtractedTable[] = [];
  let globalTableIndex = 0;

  for (let pi = 0; pi < pageMatches.length; pi++) {
    const pageAttrs = pageMatches[pi][1];
    const pageXml = pageMatches[pi][2];

    // Try to get page name
    const nameMatch = pageAttrs.match(/draw:name\s*=\s*"([^"]*)"/i);
    const pageName = nameMatch?.[1];
    const location = pageName ? `Slide: ${pageName}` : `Slide ${pi + 1}`;

    const tableMatches = [...pageXml.matchAll(/<table:table\b[^>]*>([\s\S]*?)<\/table:table>/gi)];

    for (const tableMatch of tableMatches) {
      globalTableIndex++;
      const tableXml = tableMatch[1];

      const rowMatches = [...tableXml.matchAll(/<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/gi)];
      if (rowMatches.length === 0) continue;

      const allRows: TableCell[][] = [];

      for (const rowMatch of rowMatches) {
        const rowXml = rowMatch[1];
        const cellMatches = [...rowXml.matchAll(/<table:table-cell\b([^>]*?)>([\s\S]*?)<\/table:table-cell>/gi)];
        const cells: TableCell[] = [];

        for (const cellMatch of cellMatches) {
          const attrs = cellMatch[1];
          const cellXml = cellMatch[2];
          const value = stripXmlTags(cellXml);
          const cell: TableCell = { value };

          const colSpan = extractIntAttribute(attrs, 'table:number-columns-spanned');
          const rowSpan = extractIntAttribute(attrs, 'table:number-rows-spanned');
          if (colSpan) cell.colSpan = colSpan;
          if (rowSpan) cell.rowSpan = rowSpan;

          cells.push(cell);
        }

        allRows.push(cells);
      }

      if (allRows.length === 0) continue;

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
        tableIndex: globalTableIndex,
        location,
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
