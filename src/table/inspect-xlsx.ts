import XLSX from 'xlsx';
import type { CellObject, WorkSheet } from 'xlsx';
import { getCell, renderCell, isNonEmptyCell } from '../inspect/xlsx-cells.js';
import { estimateTokens } from '../inspect/shared.js';
import type { ExtractedTable, InspectTableOptions, TableCell } from './types.js';

interface MergeInfo {
  colSpan: number;
  rowSpan: number;
}

function buildMergeMap(sheet: WorkSheet): Map<string, MergeInfo> {
  const map = new Map<string, MergeInfo>();
  const merges = sheet['!merges'] ?? [];
  for (const merge of merges) {
    const key = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    map.set(key, {
      colSpan: merge.e.c - merge.s.c + 1,
      rowSpan: merge.e.r - merge.s.r + 1,
    });
  }
  return map;
}

function buildMergedCellSet(sheet: WorkSheet): Set<string> {
  const set = new Set<string>();
  const merges = sheet['!merges'] ?? [];
  for (const merge of merges) {
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (r === merge.s.r && c === merge.s.c) continue;
        set.add(XLSX.utils.encode_cell({ r, c }));
      }
    }
  }
  return set;
}

function detectHeaders(
  sheet: WorkSheet,
  startRow: number,
  startCol: number,
  endCol: number,
  headerRow: 'auto' | 'none' | number,
): string[] | null {
  if (headerRow === 'none') return null;

  const rowIndex = typeof headerRow === 'number' ? headerRow - 1 : startRow;

  const values: string[] = [];
  let nonEmpty = 0;
  for (let c = startCol; c <= endCol; c++) {
    const cell = getCell(sheet, rowIndex, c);
    const val = renderCell(cell);
    values.push(val);
    if (val) nonEmpty++;
  }

  if (nonEmpty === 0) return null;

  if (headerRow === 'auto') {
    // Check if all non-empty values are unique strings
    const nonEmptyValues = values.filter(v => v.length > 0);
    if (nonEmptyValues.length > 0 && new Set(nonEmptyValues).size === nonEmptyValues.length) {
      // Check that values look like headers (all strings in the row)
      let allString = true;
      for (let c = startCol; c <= endCol; c++) {
        const cell = getCell(sheet, rowIndex, c);
        if (cell && isNonEmptyCell(cell) && cell.t !== 's' && cell.t !== 'z') {
          allString = false;
          break;
        }
      }
      if (allString) return values;
    }
    return null;
  }

  return values;
}

export async function extractXlsxTables(buffer: Buffer, options: InspectTableOptions): Promise<ExtractedTable[]> {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellText: true,
    cellDates: true,
    sheetStubs: true,
  });

  const tables: ExtractedTable[] = [];
  let tableIndex = 0;

  for (let si = 0; si < workbook.SheetNames.length; si++) {
    const sheetName = workbook.SheetNames[si];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    tableIndex++;
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const mergeMap = buildMergeMap(sheet);
    const mergedCellSet = buildMergedCellSet(sheet);

    const startRow = range.s.r;
    const startCol = range.s.c;
    const endCol = range.e.c;
    const endRow = range.e.r;

    // Detect headers
    const headers = detectHeaders(sheet, startRow, startCol, endCol, options.headerRow);
    const dataStartRow = headers ? startRow + 1 : startRow;

    const totalRows = endRow - startRow + 1;
    const totalCols = endCol - startCol + 1;

    // Build rows
    const maxRows = options.sampleRows;
    const dataRowCount = endRow - dataStartRow + 1;
    const truncated = dataRowCount > maxRows;
    const rowLimit = Math.min(dataRowCount, maxRows);

    const rows: { index: number; cells: TableCell[] }[] = [];
    let chars = 0;

    // Count total chars for token estimate (including header row)
    if (headers) {
      for (const h of headers) chars += h.length + 1;
      chars += 1;
    }

    let nonEmptyRowCount = 0;
    for (let r = dataStartRow; r <= endRow; r++) {
      const cells: TableCell[] = [];
      let rowHasContent = false;

      for (let c = startCol; c <= endCol; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        if (mergedCellSet.has(cellAddr)) {
          cells.push({ value: '' });
          continue;
        }

        const cell = getCell(sheet, r, c);
        const value = renderCell(cell);
        const tableCell: TableCell = { value };

        const merge = mergeMap.get(cellAddr);
        if (merge) {
          if (merge.colSpan > 1) tableCell.colSpan = merge.colSpan;
          if (merge.rowSpan > 1) tableCell.rowSpan = merge.rowSpan;
        }

        if (value) rowHasContent = true;
        cells.push(tableCell);
        chars += value.length + 1;
      }
      chars += 1;

      if (!rowHasContent) continue;
      nonEmptyRowCount++;

      if (rows.length < rowLimit) {
        rows.push({ index: r - startRow + 1, cells });
      }
    }

    // Cell count
    let cellCount = 0;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = getCell(sheet, r, c);
        if (cell && isNonEmptyCell(cell)) cellCount++;
      }
    }

    tables.push({
      tableIndex,
      location: `Sheet: ${sheetName}`,
      rowCount: totalRows,
      columnCount: totalCols,
      cellCount,
      headers,
      rows,
      truncated: truncated && rows.length >= rowLimit,
      tokenEstimate: estimateTokens(chars),
    });
  }

  return tables;
}
