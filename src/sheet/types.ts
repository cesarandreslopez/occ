import { z } from 'zod';

export const SheetVisibilitySchema = z.enum(['visible', 'hidden', 'very_hidden']);
export type SheetVisibility = z.infer<typeof SheetVisibilitySchema>;

export const HeaderSelectionModeSchema = z.enum(['auto', 'none', 'explicit']);
export type HeaderSelectionMode = z.infer<typeof HeaderSelectionModeSchema>;

export const ColumnValueTypeSchema = z.enum(['string', 'number', 'boolean', 'date', 'error', 'blank_stub', 'unknown']);
export type ColumnValueType = z.infer<typeof ColumnValueTypeSchema>;

export const InspectSheetOptionsSchema = z.object({
  sheet: z.string().optional(),
  sampleRows: z.number(),
  headerRow: z.union([z.literal('auto'), z.literal('none'), z.number()]),
  maxColumns: z.number(),
});
export type InspectSheetOptions = z.infer<typeof InspectSheetOptionsSchema>;

export const DefinedNameInfoSchema = z.object({
  name: z.string(),
  ref: z.string(),
  scope: z.enum(['workbook', 'sheet']),
  sheetIndex: z.number().optional(),
  sheetName: z.string().optional(),
  external: z.boolean(),
});
export type DefinedNameInfo = z.infer<typeof DefinedNameInfoSchema>;

export const WorkbookPropertiesSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  author: z.string().optional(),
  company: z.string().optional(),
  manager: z.string().optional(),
  createdDate: z.string().optional(),
  modifiedDate: z.string().optional(),
});
export type WorkbookProperties = z.infer<typeof WorkbookPropertiesSchema>;

export const WorkbookRiskFlagsSchema = z.object({
  hiddenSheets: z.boolean(),
  formulas: z.boolean(),
  comments: z.boolean(),
  hyperlinks: z.boolean(),
  mergedCells: z.boolean(),
  protectedSheets: z.boolean(),
  externalFormulaRefs: z.boolean(),
});
export type WorkbookRiskFlags = z.infer<typeof WorkbookRiskFlagsSchema>;

export const CellTypeCountsSchema = z.object({
  string: z.number(),
  number: z.number(),
  boolean: z.number(),
  date: z.number(),
  error: z.number(),
  blankStub: z.number(),
});
export type CellTypeCounts = z.infer<typeof CellTypeCountsSchema>;

export const ColumnProfileSchema = z.object({
  index: z.number(),
  letter: z.string(),
  name: z.string(),
  dominantType: ColumnValueTypeSchema,
  nonEmptyCount: z.number(),
  nonEmptyRatio: z.number(),
  examples: z.array(z.string()),
});
export type ColumnProfile = z.infer<typeof ColumnProfileSchema>;

export const SampleRowSchema = z.object({
  rowNumber: z.number(),
  values: z.record(z.string(), z.string()),
});
export type SampleRow = z.infer<typeof SampleRowSchema>;

export const SheetProfileSchema = z.object({
  index: z.number(),
  name: z.string(),
  visibility: SheetVisibilitySchema,
  usedRange: z.string().nullable(),
  totalRows: z.number(),
  totalCols: z.number(),
  rectangularRangeCellCount: z.number(),
  nonEmptyCellCount: z.number(),
  cellTypeCounts: CellTypeCountsSchema,
  formulaCellCount: z.number(),
  commentCellCount: z.number(),
  hyperlinkCellCount: z.number(),
  mergedRangeCount: z.number(),
  hiddenRowCount: z.number(),
  hiddenColumnCount: z.number(),
  autoFilterRef: z.string().nullable(),
  protected: z.boolean(),
  definedNames: z.array(DefinedNameInfoSchema),
  externalFormulaRefCount: z.number(),
  headerSelection: z.object({
    requested: z.union([z.literal('auto'), z.literal('none'), z.number()]),
    mode: HeaderSelectionModeSchema,
    rowNumber: z.number().nullable(),
  }),
  schema: z.object({
    truncated: z.boolean(),
    columns: z.array(ColumnProfileSchema),
  }),
  sample: z.object({
    truncatedRows: z.boolean(),
    truncatedColumns: z.boolean(),
    rows: z.array(SampleRowSchema),
  }),
  sampleTokenEstimate: z.number(),
  fullTokenEstimate: z.number(),
  estimateMethod: z.literal('full_scan'),
});
export type SheetProfile = z.infer<typeof SheetProfileSchema>;

export const WorkbookInspectionSchema = z.object({
  file: z.string(),
  format: z.literal('xlsx'),
  size: z.number(),
  properties: WorkbookPropertiesSchema,
  customPropertyCount: z.number(),
  customProperties: z.record(z.string(), z.unknown()),
  sheetCount: z.number(),
  visibleSheetCount: z.number(),
  hiddenSheetCount: z.number(),
  veryHiddenSheetCount: z.number(),
  definedNames: z.array(DefinedNameInfoSchema),
  riskFlags: WorkbookRiskFlagsSchema,
});
export type WorkbookInspection = z.infer<typeof WorkbookInspectionSchema>;

export const SheetInspectionResultSchema = z.object({
  workbook: WorkbookInspectionSchema,
  sheets: z.array(SheetProfileSchema),
});
export type SheetInspectionResult = z.infer<typeof SheetInspectionResultSchema>;

export const SheetInspectPayloadSchema = z.object({
  file: z.string(),
  query: z.record(z.string(), z.unknown()),
  results: SheetInspectionResultSchema,
});
export type SheetInspectPayload = z.infer<typeof SheetInspectPayloadSchema>;
