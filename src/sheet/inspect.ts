import path from 'node:path';
import { readFile } from 'node:fs/promises';
import XLSX from 'xlsx';
import type { CellObject, Range, WorkSheet } from 'xlsx';
import { estimateTokens, asOptionalString, formatDateLike } from '../inspect/shared.js';
import { getCell, renderCell, isNonEmptyCell } from '../inspect/xlsx-cells.js';
import type {
  CellTypeCounts,
  ColumnProfile,
  ColumnValueType,
  DefinedNameInfo,
  InspectSheetOptions,
  SampleRow,
  SheetInspectPayload,
  SheetInspectionResult,
  SheetProfile,
  SheetVisibility,
  WorkbookInspection,
  WorkbookProperties,
  WorkbookRiskFlags,
} from './types.js';

const MAX_HEADER_SCAN_ROWS = 10;
const MAX_COLUMN_SCAN_VALUES = 200;

interface ScanColumn {
  index: number;
  letter: string;
  name: string;
  examples: string[];
  nonEmptyCount: number;
  scannedCount: number;
  typeCounts: Record<ColumnValueType, number>;
}

export function createSheetPayload(filePath: string, query: Record<string, unknown>, results: SheetInspectionResult): SheetInspectPayload {
  return {
    file: filePath,
    query,
    results,
  };
}

export async function inspectWorkbook(filePath: string, options: InspectSheetOptions): Promise<SheetInspectionResult> {
  const resolvedPath = path.resolve(filePath);
  if (path.extname(resolvedPath).toLowerCase() !== '.xlsx') {
    throw new Error(`Unsupported spreadsheet format: ${path.extname(resolvedPath) || '(none)'} (expected .xlsx)`);
  }

  const buffer = await readFile(resolvedPath);
  const baseWorkbook = XLSX.read(buffer, { type: 'buffer', bookProps: true, bookSheets: true });
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellFormula: true,
    cellStyles: true,
    cellDates: true,
    cellText: true,
    sheetStubs: true,
  });

  const inventory = resolveRequestedSheets(workbook, options.sheet);
  const workbookNames = extractDefinedNames(workbook, inventory.sheetNames);
  const sheetProfiles = inventory.indices.map((sheetIndex) =>
    inspectSheet(workbook, sheetIndex, workbookNames, options),
  );
  const workbookInspection = inspectWorkbookMetadata(
    resolvedPath,
    buffer.length,
    baseWorkbook,
    workbookNames,
    sheetProfiles,
  );

  return {
    workbook: workbookInspection,
    sheets: sheetProfiles,
  };
}

function inspectWorkbookMetadata(
  filePath: string,
  size: number,
  workbook: XLSX.WorkBook,
  definedNames: DefinedNameInfo[],
  sheets: SheetProfile[],
): WorkbookInspection {
  const visibleSheetCount = sheets.filter(sheet => sheet.visibility === 'visible').length;
  const hiddenSheetCount = sheets.filter(sheet => sheet.visibility === 'hidden').length;
  const veryHiddenSheetCount = sheets.filter(sheet => sheet.visibility === 'very_hidden').length;
  const riskFlags: WorkbookRiskFlags = {
    hiddenSheets: hiddenSheetCount + veryHiddenSheetCount > 0,
    formulas: sheets.some(sheet => sheet.formulaCellCount > 0),
    comments: sheets.some(sheet => sheet.commentCellCount > 0),
    hyperlinks: sheets.some(sheet => sheet.hyperlinkCellCount > 0),
    mergedCells: sheets.some(sheet => sheet.mergedRangeCount > 0),
    protectedSheets: sheets.some(sheet => sheet.protected),
    externalFormulaRefs: sheets.some(sheet => sheet.externalFormulaRefCount > 0) || definedNames.some(name => name.external),
  };

  return {
    file: filePath,
    format: 'xlsx',
    size,
    properties: pickWorkbookProperties(workbook.Props),
    customPropertyCount: Object.keys(workbook.Custprops ?? {}).length,
    customProperties: (workbook.Custprops ?? {}) as Record<string, unknown>,
    sheetCount: workbook.SheetNames.length,
    visibleSheetCount,
    hiddenSheetCount,
    veryHiddenSheetCount,
    definedNames: definedNames.filter(name => name.scope === 'workbook'),
    riskFlags,
  };
}

function pickWorkbookProperties(props: XLSX.FullProperties | undefined): WorkbookProperties {
  if (!props) return {};
  return {
    title: asOptionalString(props.Title),
    subject: asOptionalString(props.Subject),
    author: asOptionalString(props.Author),
    company: asOptionalString(props.Company),
    manager: asOptionalString(props.Manager),
    createdDate: formatDateLike(props.CreatedDate),
    modifiedDate: formatDateLike(props.ModifiedDate),
  };
}

function resolveRequestedSheets(workbook: XLSX.WorkBook, selector?: string): { indices: number[]; sheetNames: string[] } {
  if (!selector) {
    return {
      indices: workbook.SheetNames.map((_, index) => index),
      sheetNames: workbook.SheetNames,
    };
  }

  const byName = workbook.SheetNames.findIndex(name => name === selector);
  if (byName >= 0) {
    return { indices: [byName], sheetNames: workbook.SheetNames };
  }

  if (/^\d+$/.test(selector)) {
    const index = Number.parseInt(selector, 10) - 1;
    if (index >= 0 && index < workbook.SheetNames.length) {
      return { indices: [index], sheetNames: workbook.SheetNames };
    }
  }

  throw new Error(`Sheet not found: ${selector}`);
}

function inspectSheet(
  workbook: XLSX.WorkBook,
  sheetIndex: number,
  definedNames: DefinedNameInfo[],
  options: InspectSheetOptions,
): SheetProfile {
  const name = workbook.SheetNames[sheetIndex];
  const sheet = workbook.Sheets[name];
  if (!sheet) {
    throw new Error(`Worksheet missing from workbook: ${name}`);
  }

  const workbookSheetMeta = workbook.Workbook?.Sheets?.[sheetIndex];
  const visibility = mapVisibility(workbookSheetMeta?.Hidden);
  const usedRange = typeof sheet['!ref'] === 'string' ? sheet['!ref'] : null;
  const decodedRange = usedRange ? XLSX.utils.decode_range(usedRange) : null;
  const totalRows = decodedRange ? decodedRange.e.r - decodedRange.s.r + 1 : 0;
  const totalCols = decodedRange ? decodedRange.e.c - decodedRange.s.c + 1 : 0;
  const rectangularRangeCellCount = totalRows * totalCols;

  const cellTypeCounts: CellTypeCounts = {
    string: 0,
    number: 0,
    boolean: 0,
    date: 0,
    error: 0,
    blankStub: 0,
  };
  let nonEmptyCellCount = 0;
  let formulaCellCount = 0;
  let commentCellCount = 0;
  let hyperlinkCellCount = 0;
  let externalFormulaRefCount = 0;
  let fullTokenChars = 0;

  if (decodedRange) {
    for (let row = decodedRange.s.r; row <= decodedRange.e.r; row++) {
      let rowHasContent = false;
      let rowChars = 0;

      for (let col = decodedRange.s.c; col <= decodedRange.e.c; col++) {
        const cell = getCell(sheet, row, col);
        if (!cell) continue;

        const typeKey = toTypeCounterKey(cell);
        cellTypeCounts[typeKey] += 1;

        if (cell.f) {
          formulaCellCount += 1;
          if (isExternalFormula(cell.f)) externalFormulaRefCount += 1;
        }
        if (cell.c?.length) commentCellCount += 1;
        if (cell.l?.Target) hyperlinkCellCount += 1;

        if (!isNonEmptyCell(cell)) continue;

        nonEmptyCellCount += 1;
        rowHasContent = true;
        const rendered = renderCell(cell);
        rowChars += rendered.length + 1;
      }

      if (rowHasContent) {
        fullTokenChars += rowChars + 1;
      }
    }
  }

  const headerSelection = resolveHeaderSelection(sheet, decodedRange, options.headerRow);
  const schema = buildSchema(sheet, decodedRange, headerSelection.rowNumber, options.maxColumns);
  const sample = buildSample(sheet, decodedRange, headerSelection.rowNumber, options.sampleRows, schema.columns);
  const sampleTokenEstimate = estimateTokens(estimateSampleChars(sample.rows));

  return {
    index: sheetIndex + 1,
    name,
    visibility,
    usedRange,
    totalRows,
    totalCols,
    rectangularRangeCellCount,
    nonEmptyCellCount,
    cellTypeCounts,
    formulaCellCount,
    commentCellCount,
    hyperlinkCellCount,
    mergedRangeCount: sheet['!merges']?.length ?? 0,
    hiddenRowCount: sheet['!rows']?.filter(row => row?.hidden).length ?? 0,
    hiddenColumnCount: sheet['!cols']?.filter(col => col?.hidden).length ?? 0,
    autoFilterRef: sheet['!autofilter']?.ref ?? null,
    protected: !!sheet['!protect'],
    definedNames: definedNames.filter((definedName) => definedName.sheetIndex === sheetIndex),
    externalFormulaRefCount,
    headerSelection,
    schema,
    sample,
    sampleTokenEstimate,
    fullTokenEstimate: estimateTokens(fullTokenChars),
    estimateMethod: 'full_scan',
  };
}

function buildSchema(
  sheet: WorkSheet,
  range: Range | null,
  headerRowNumber: number | null,
  maxColumns: number,
): { truncated: boolean; columns: ColumnProfile[] } {
  if (!range) return { truncated: false, columns: [] };

  const cappedCols = Math.min(maxColumns, range.e.c - range.s.c + 1);
  const columns: ScanColumn[] = [];
  const headerRowIndex = headerRowNumber != null ? headerRowNumber - 1 : null;
  const dataStartRow = headerRowIndex != null ? Math.max(range.s.r, headerRowIndex + 1) : range.s.r;
  const dataRowCount = Math.max(0, range.e.r - dataStartRow + 1);

  for (let offset = 0; offset < cappedCols; offset++) {
    const colIndex = range.s.c + offset;
    const headerCell = headerRowIndex != null ? getCell(sheet, headerRowIndex, colIndex) : undefined;
    const name = headerRowIndex != null
      ? renderHeaderName(headerCell, colIndex)
      : XLSX.utils.encode_col(colIndex);
    columns.push({
      index: offset + 1,
      letter: XLSX.utils.encode_col(colIndex),
      name,
      examples: [],
      nonEmptyCount: 0,
      scannedCount: 0,
      typeCounts: {
        string: 0,
        number: 0,
        boolean: 0,
        date: 0,
        error: 0,
        blank_stub: 0,
        unknown: 0,
      },
    });
  }

  for (let row = dataStartRow; row <= range.e.r; row++) {
    for (let offset = 0; offset < cappedCols; offset++) {
      const column = columns[offset];
      const colIndex = range.s.c + offset;
      const cell = getCell(sheet, row, colIndex);
      if (!cell || !isNonEmptyCell(cell)) continue;

      column.nonEmptyCount += 1;
      if (column.scannedCount >= MAX_COLUMN_SCAN_VALUES) continue;
      column.scannedCount += 1;
      const valueType = inferValueType(cell);
      column.typeCounts[valueType] += 1;
      const rendered = renderCell(cell);
      if (rendered && column.examples.length < 3) {
        column.examples.push(rendered);
      }
    }
  }

  return {
    truncated: cappedCols < (range.e.c - range.s.c + 1),
    columns: columns.map((column) => ({
      index: column.index,
      letter: column.letter,
      name: column.name,
      dominantType: dominantColumnType(column.typeCounts),
      nonEmptyCount: column.nonEmptyCount,
      nonEmptyRatio: dataRowCount > 0 ? Number((column.nonEmptyCount / dataRowCount).toFixed(3)) : 0,
      examples: column.examples,
    })),
  };
}

function buildSample(
  sheet: WorkSheet,
  range: Range | null,
  headerRowNumber: number | null,
  sampleRows: number,
  columns: ColumnProfile[],
): { truncatedRows: boolean; truncatedColumns: boolean; rows: SampleRow[] } {
  if (!range || sampleRows <= 0 || columns.length === 0) {
    return {
      truncatedRows: false,
      truncatedColumns: false,
      rows: [],
    };
  }

  const startRow = headerRowNumber != null ? Math.max(range.s.r, headerRowNumber) : range.s.r;
  const rows: SampleRow[] = [];

  for (let row = startRow; row <= range.e.r && rows.length < sampleRows; row++) {
    const values: Record<string, string> = {};
    let rowHasContent = false;

    for (let offset = 0; offset < columns.length; offset++) {
      const colIndex = range.s.c + offset;
      const rendered = renderCell(getCell(sheet, row, colIndex));
      if (rendered) rowHasContent = true;
      values[columns[offset].name] = rendered;
    }

    if (!rowHasContent) continue;
    rows.push({ rowNumber: row + 1, values });
  }

  const lastSampledRowIndex = rows.length > 0 ? rows[rows.length - 1].rowNumber - 1 : startRow - 1;
  let hasMoreRows = false;
  for (let row = lastSampledRowIndex + 1; row <= range.e.r; row++) {
    for (let offset = 0; offset < columns.length; offset++) {
      const colIndex = range.s.c + offset;
      if (renderCell(getCell(sheet, row, colIndex))) {
        hasMoreRows = true;
        break;
      }
    }
    if (hasMoreRows) break;
  }

  return {
    truncatedRows: hasMoreRows,
    truncatedColumns: columns.length < (range.e.c - range.s.c + 1),
    rows,
  };
}

function resolveHeaderSelection(
  sheet: WorkSheet,
  range: Range | null,
  headerRow: 'auto' | 'none' | number,
): SheetProfile['headerSelection'] {
  if (!range) {
    return {
      requested: headerRow,
      mode: headerRow === 'auto' ? 'auto' : headerRow === 'none' ? 'none' : 'explicit',
      rowNumber: null,
    };
  }

  if (headerRow === 'none') {
    return { requested: 'none', mode: 'none', rowNumber: null };
  }

  if (typeof headerRow === 'number') {
    return { requested: headerRow, mode: 'explicit', rowNumber: headerRow };
  }

  const candidateRows = firstNonEmptyRows(sheet, range, MAX_HEADER_SCAN_ROWS);
  for (const row of candidateRows) {
    const populated = populatedCells(sheet, range, row);
    if (populated.length === 0) continue;
    const renderedStrings = populated
      .map(cell => normalizeHeaderValue(renderCell(cell)))
      .filter(Boolean);
    if (renderedStrings.length / populated.length < 0.5) continue;
    if (new Set(renderedStrings).size !== renderedStrings.length) continue;
    return { requested: 'auto', mode: 'auto', rowNumber: row + 1 };
  }

  return { requested: 'auto', mode: 'auto', rowNumber: null };
}

function firstNonEmptyRows(sheet: WorkSheet, range: Range, limit: number): number[] {
  const rows: number[] = [];
  for (let row = range.s.r; row <= range.e.r && rows.length < limit; row++) {
    if (populatedCells(sheet, range, row).length > 0) {
      rows.push(row);
    }
  }
  return rows;
}

function populatedCells(sheet: WorkSheet, range: Range, row: number): CellObject[] {
  const cells: CellObject[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = getCell(sheet, row, col);
    if (!cell || !isNonEmptyCell(cell)) continue;
    cells.push(cell);
  }
  return cells;
}

function extractDefinedNames(workbook: XLSX.WorkBook, sheetNames: string[]): DefinedNameInfo[] {
  return (workbook.Workbook?.Names ?? []).map((name) => ({
    name: String(name.Name ?? ''),
    ref: String(name.Ref ?? ''),
    scope: typeof name.Sheet === 'number' ? 'sheet' : 'workbook',
    sheetIndex: typeof name.Sheet === 'number' ? name.Sheet : undefined,
    sheetName: typeof name.Sheet === 'number' ? sheetNames[name.Sheet] : undefined,
    external: isExternalFormula(String(name.Ref ?? '')),
  }));
}

function mapVisibility(hidden: unknown): SheetVisibility {
  if (hidden === 1) return 'hidden';
  if (hidden === 2) return 'very_hidden';
  return 'visible';
}

function renderHeaderName(cell: CellObject | undefined, colIndex: number): string {
  const rendered = renderCell(cell);
  return rendered || XLSX.utils.encode_col(colIndex);
}

/**
 * @deprecated Import from '../inspect/xlsx-cells.js' instead.
 * These re-exports will be removed in a future release.
 */
export { getCell, renderCell, isNonEmptyCell } from '../inspect/xlsx-cells.js';

function inferValueType(cell: CellObject): ColumnValueType {
  if (cell.t === 's') return 'string';
  if (cell.t === 'n') return 'number';
  if (cell.t === 'b') return 'boolean';
  if (cell.t === 'd') return 'date';
  if (cell.t === 'e') return 'error';
  if (cell.t === 'z') return 'blank_stub';
  if (cell.v instanceof Date) return 'date';
  if (typeof cell.v === 'string') return 'string';
  if (typeof cell.v === 'number') return 'number';
  if (typeof cell.v === 'boolean') return 'boolean';
  return 'unknown';
}

function toTypeCounterKey(cell: CellObject): keyof CellTypeCounts {
  const inferred = inferValueType(cell);
  if (inferred === 'blank_stub') return 'blankStub';
  if (inferred === 'string') return 'string';
  if (inferred === 'number') return 'number';
  if (inferred === 'boolean') return 'boolean';
  if (inferred === 'date') return 'date';
  return 'error';
}

function dominantColumnType(typeCounts: Record<ColumnValueType, number>): ColumnValueType {
  const entries = Object.entries(typeCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  return (entries[0]?.[0] as ColumnValueType | undefined) ?? 'unknown';
}

function normalizeHeaderValue(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function isExternalFormula(formula: string): boolean {
  return /\[[^\]]+\]/.test(formula) || /https?:\/\//i.test(formula);
}

function estimateSampleChars(rows: SampleRow[]): number {
  let chars = 0;
  for (const row of rows) {
    chars += String(row.rowNumber).length + 1;
    for (const value of Object.values(row.values)) {
      chars += value.length + 1;
    }
    chars += 1;
  }
  return chars;
}

