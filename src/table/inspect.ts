import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { getExtension } from '../utils.js';
import { extractDocxTables } from './inspect-docx.js';
import { extractXlsxTables } from './inspect-xlsx.js';
import { extractPptxTables } from './inspect-pptx.js';
import { extractOdtTables } from './inspect-odt.js';
import { extractOdpTables } from './inspect-odp.js';
import type { InspectTableOptions, TableInspectionResult } from './types.js';

const TableFormatSchema = z.enum(['docx', 'xlsx', 'pptx', 'odt', 'odp', 'pdf']);
const SUPPORTED_FORMATS: ReadonlySet<string> = new Set(TableFormatSchema.options);

export async function inspectTables(filePath: string, options: InspectTableOptions): Promise<TableInspectionResult> {
  const resolvedPath = path.resolve(filePath);
  const ext = getExtension(resolvedPath);

  if (!SUPPORTED_FORMATS.has(ext)) {
    throw new Error(`Unsupported format: .${ext || '(none)'} (supported: docx, xlsx, pptx, odt, odp, pdf)`);
  }

  const fileStats = await stat(resolvedPath);
  const format = TableFormatSchema.parse(ext);

  if (format === 'pdf') {
    return {
      file: resolvedPath,
      format,
      size: fileStats.size,
      tableCount: 0,
      tables: [],
      notes: ['PDF format does not support structural table extraction. Tables in PDFs are rendered as positioned text without semantic structure. Consider converting to DOCX first for table extraction.'],
      totalTokenEstimate: 0,
    };
  }

  const buffer = await readFile(resolvedPath);
  let tables;

  switch (format) {
    case 'docx':
      tables = await extractDocxTables(resolvedPath, options);
      break;
    case 'xlsx':
      tables = await extractXlsxTables(buffer, options);
      break;
    case 'pptx':
      tables = await extractPptxTables(buffer, options);
      break;
    case 'odt':
      tables = await extractOdtTables(buffer, options);
      break;
    case 'odp':
      tables = await extractOdpTables(buffer, options);
      break;
  }

  // Filter to specific table if requested
  if (options.table && tables) {
    tables = tables.filter(t => t.tableIndex === options.table);
  }

  const totalTokenEstimate = tables.reduce((sum, t) => sum + t.tokenEstimate, 0);

  return {
    file: resolvedPath,
    format,
    size: fileStats.size,
    tableCount: tables.length,
    tables,
    notes: [],
    totalTokenEstimate,
  };
}
