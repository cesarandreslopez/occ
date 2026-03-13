export interface TableCell {
  value: string;
  colSpan?: number;   // only if > 1
  rowSpan?: number;   // only if > 1
}

export interface ExtractedTable {
  tableIndex: number;            // 1-based
  location: string | null;       // "Slide 3", "Sheet: Sales", null for DOCX body
  rowCount: number;
  columnCount: number;
  cellCount: number;
  headers: string[] | null;      // auto-detected first row, or null
  rows: { index: number; cells: TableCell[] }[];
  truncated: boolean;
  tokenEstimate: number;
}

export interface TableInspectionResult {
  file: string;
  format: 'docx' | 'xlsx' | 'pptx' | 'odt' | 'odp' | 'pdf';
  size: number;
  tableCount: number;
  tables: ExtractedTable[];
  notes: string[];
  totalTokenEstimate: number;
}

export interface TableInspectPayload {
  file: string;
  query: Record<string, unknown>;
  results: TableInspectionResult;
}

export interface InspectTableOptions {
  table?: number;                // select specific table (1-based)
  sampleRows: number;            // max rows per table (default: 20)
  headerRow: 'auto' | 'none' | number;
}
