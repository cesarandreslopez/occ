export type SheetVisibility = 'visible' | 'hidden' | 'very_hidden';
export type HeaderSelectionMode = 'auto' | 'none' | 'explicit';
export type ColumnValueType = 'string' | 'number' | 'boolean' | 'date' | 'error' | 'blank_stub' | 'unknown';

export interface InspectSheetOptions {
  sheet?: string;
  sampleRows: number;
  headerRow: 'auto' | 'none' | number;
  maxColumns: number;
}

export interface DefinedNameInfo {
  name: string;
  ref: string;
  scope: 'workbook' | 'sheet';
  sheetIndex?: number;
  sheetName?: string;
  external: boolean;
}

export interface WorkbookProperties {
  title?: string;
  subject?: string;
  author?: string;
  company?: string;
  manager?: string;
  createdDate?: string;
  modifiedDate?: string;
}

export interface WorkbookRiskFlags {
  hiddenSheets: boolean;
  formulas: boolean;
  comments: boolean;
  hyperlinks: boolean;
  mergedCells: boolean;
  protectedSheets: boolean;
  externalFormulaRefs: boolean;
}

export interface CellTypeCounts {
  string: number;
  number: number;
  boolean: number;
  date: number;
  error: number;
  blankStub: number;
}

export interface ColumnProfile {
  index: number;
  letter: string;
  name: string;
  dominantType: ColumnValueType;
  nonEmptyCount: number;
  nonEmptyRatio: number;
  examples: string[];
}

export interface SampleRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface SheetProfile {
  index: number;
  name: string;
  visibility: SheetVisibility;
  usedRange: string | null;
  totalRows: number;
  totalCols: number;
  rectangularRangeCellCount: number;
  nonEmptyCellCount: number;
  cellTypeCounts: CellTypeCounts;
  formulaCellCount: number;
  commentCellCount: number;
  hyperlinkCellCount: number;
  mergedRangeCount: number;
  hiddenRowCount: number;
  hiddenColumnCount: number;
  autoFilterRef: string | null;
  protected: boolean;
  definedNames: DefinedNameInfo[];
  externalFormulaRefCount: number;
  headerSelection: {
    requested: 'auto' | 'none' | number;
    mode: HeaderSelectionMode;
    rowNumber: number | null;
  };
  schema: {
    truncated: boolean;
    columns: ColumnProfile[];
  };
  sample: {
    truncatedRows: boolean;
    truncatedColumns: boolean;
    rows: SampleRow[];
  };
  sampleTokenEstimate: number;
  fullTokenEstimate: number;
  estimateMethod: 'full_scan';
}

export interface WorkbookInspection {
  file: string;
  format: 'xlsx';
  size: number;
  properties: WorkbookProperties;
  customPropertyCount: number;
  customProperties: Record<string, unknown>;
  sheetCount: number;
  visibleSheetCount: number;
  hiddenSheetCount: number;
  veryHiddenSheetCount: number;
  definedNames: DefinedNameInfo[];
  riskFlags: WorkbookRiskFlags;
}

export interface SheetInspectionResult {
  workbook: WorkbookInspection;
  sheets: SheetProfile[];
}

export interface SheetInspectPayload {
  file: string;
  query: Record<string, unknown>;
  results: SheetInspectionResult;
}
