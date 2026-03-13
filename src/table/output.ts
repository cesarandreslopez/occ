import Table from 'cli-table3';
import chalk from 'chalk';
import { formatBytes, formatNumber } from '../utils.js';
import { sectionHeader, stripAnsi, tableChars } from '../output/tabular.js';
import type { TableInspectionResult, TableInspectPayload, ExtractedTable } from './types.js';

type ColorFn = (value: string) => string;

interface ColorScheme {
  header: ColorFn;
  key: ColorFn;
  value: ColorFn;
  dim: ColorFn;
  ok: ColorFn;
  warn: ColorFn;
}

const colors: ColorScheme = {
  header: (value) => chalk.bold(value),
  key: (value) => chalk.cyan(value),
  value: (value) => value,
  dim: (value) => chalk.dim(value),
  ok: (value) => chalk.green(value),
  warn: (value) => chalk.yellow(value),
};

const noColor: ColorScheme = Object.fromEntries(
  Object.keys(colors).map(key => [key, (value: string) => value]),
) as unknown as ColorScheme;

function palette(ci = false): ColorScheme {
  return ci ? noColor : colors;
}

export function formatTablePayloadJson(payload: TableInspectPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function formatTableInspection(result: TableInspectionResult, ci = false): string {
  const c = palette(ci);
  const sections: string[] = [];

  // Overview
  const overviewLines = [
    `${c.key('File')}: ${c.value(result.file)}`,
    `${c.key('Format')}: ${c.value(result.format.toUpperCase())}`,
    `${c.key('Size')}: ${c.value(formatBytes(result.size))}`,
    `${c.key('Tables Found')}: ${c.value(formatNumber(result.tableCount))}`,
  ];

  if (result.totalTokenEstimate > 0) {
    overviewLines.push(`${c.key('Total Token Estimate')}: ${c.value(formatNumber(result.totalTokenEstimate))}`);
  }

  sections.push(overviewLines.join('\n'));

  // Notes
  if (result.notes.length > 0) {
    for (const note of result.notes) {
      sections.push(c.dim(`Note: ${note}`));
    }
  }

  // Per-table sections
  for (const table of result.tables) {
    sections.push(formatSingleTable(table, c, ci));
  }

  return sections.join('\n\n') + '\n';
}

function formatSingleTable(table: ExtractedTable, c: ColorScheme, ci: boolean): string {
  const lines: string[] = [];

  // Table header info
  const titleParts = [`Table ${table.tableIndex}`];
  if (table.location) titleParts.push(`(${table.location})`);
  titleParts.push(`— ${table.rowCount} rows × ${table.columnCount} cols, ${formatNumber(table.cellCount)} cells`);

  const infoLine = `  ${c.key('Token Estimate')}: ${formatNumber(table.tokenEstimate)}`;

  // Build the data table
  const headRow = table.headers || [];
  const hasHeaders = headRow.length > 0;

  if (table.rows.length === 0 && !hasHeaders) {
    const titleStr = titleParts.join(' ');
    const width = Math.max(stripAnsi(titleStr).length + 6, stripAnsi(infoLine).length, 56);
    return `${c.header(sectionHeader(titleStr, width, ci))}\n${infoLine}\n  ${c.dim('(no data rows)')}`;
  }

  // Determine column count for the display table
  const colCount = table.columnCount;
  const displayHeaders: string[] = hasHeaders
    ? headRow.map((h, i) => h || `Col ${i + 1}`)
    : Array.from({ length: colCount }, (_, i) => `Col ${i + 1}`);

  const dataTable = new Table({
    head: ['#', ...displayHeaders.map(h => c.key(h))],
    chars: tableChars(ci),
    style: { head: [], border: [] },
    colAligns: ['right', ...Array(colCount).fill('left')] as Table.HorizontalAlignment[],
  });

  for (const row of table.rows) {
    const rowCells = Array.from({ length: colCount }, (_, i) => {
      const cell = row.cells[i];
      return cell ? cell.value : '';
    });
    dataTable.push([String(row.index), ...rowCells]);
  }

  const rendered = dataTable.toString();
  const tableWidth = Math.max(
    ...rendered.split('\n').map(line => stripAnsi(line).length),
    56,
  );

  const titleStr = titleParts.join(' ');
  const parts = [
    c.header(sectionHeader(titleStr, tableWidth, ci)),
    infoLine,
    rendered,
  ];

  if (table.truncated) {
    parts.push(c.dim(`  (showing ${table.rows.length} of ${table.rowCount - (hasHeaders ? 1 : 0)} data rows)`));
  }

  return parts.join('\n');
}
