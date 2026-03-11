import Table from 'cli-table3';
import chalk from 'chalk';
import { formatBytes, formatNumber } from '../utils.js';
import { sectionHeader, stripAnsi, tableChars } from '../output/tabular.js';
import type { ColumnProfile, SampleRow, SheetInspectPayload, SheetInspectionResult, SheetProfile } from './types.js';

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

export function formatSheetPayloadJson(payload: SheetInspectPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function formatSheetInspection(result: SheetInspectionResult, ci = false): string {
  const c = palette(ci);
  const sections: string[] = [];

  const overviewLines = [
    `${c.key('File')}: ${c.value(result.workbook.file)}`,
    `${c.key('Format')}: ${c.value('XLSX')}`,
    `${c.key('Size')}: ${c.value(formatBytes(result.workbook.size))}`,
    `${c.key('Sheets')}: ${c.value(`${formatNumber(result.workbook.sheetCount)} total (${formatNumber(result.workbook.visibleSheetCount)} visible, ${formatNumber(result.workbook.hiddenSheetCount)} hidden, ${formatNumber(result.workbook.veryHiddenSheetCount)} very hidden)`)}`,
  ];
  const propEntries = Object.entries(result.workbook.properties).filter(([, value]) => value);
  if (propEntries.length > 0) {
    overviewLines.push(`${c.key('Properties')}: ${propEntries.map(([key, value]) => `${key}=${value}`).join(' | ')}`);
  }
  if (result.workbook.definedNames.length > 0) {
    overviewLines.push(`${c.key('Workbook Names')}: ${result.workbook.definedNames.map(name => `${name.name}=${name.ref}`).join(' | ')}`);
  }
  const riskFlags = Object.entries(result.workbook.riskFlags).filter(([, enabled]) => enabled).map(([key]) => key);
  overviewLines.push(`${c.key('Risk Flags')}: ${riskFlags.length > 0 ? c.warn(riskFlags.join(', ')) : c.ok('none')}`);

  sections.push(overviewLines.join('\n'));

  if (result.sheets.length > 0) {
    const inventory = new Table({
      head: [
        c.key('Sheet'),
        c.key('Visibility'),
        c.key('Range'),
        c.key('Rows'),
        c.key('Cols'),
        c.key('Non-Empty'),
        c.key('Formulae'),
        c.key('Links'),
        c.key('Comments'),
        c.key('Tokens'),
      ],
      chars: tableChars(ci),
      style: { head: [], border: [] },
      colAligns: ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
    });

    for (const sheet of result.sheets) {
      inventory.push([
        `${sheet.index}. ${sheet.name}`,
        sheet.visibility,
        sheet.usedRange ?? '',
        formatNumber(sheet.totalRows),
        formatNumber(sheet.totalCols),
        formatNumber(sheet.nonEmptyCellCount),
        formatNumber(sheet.formulaCellCount),
        formatNumber(sheet.hyperlinkCellCount),
        formatNumber(sheet.commentCellCount),
        formatNumber(sheet.fullTokenEstimate),
      ]);
    }

    const rendered = inventory.toString();
    const width = stripAnsi(rendered.split('\n')[0] ?? '').length;
    sections.push(`${c.header(sectionHeader('Sheet Inventory', width, ci))}\n${rendered}`);
  }

  for (const sheet of result.sheets) {
    sections.push(formatSheetProfile(sheet, ci));
  }

  return sections.join('\n\n') + '\n';
}

function formatSheetProfile(sheet: SheetProfile, ci = false): string {
  const c = palette(ci);
  const lines: string[] = [];
  const title = `Sheet: ${sheet.name} (${sheet.visibility})`;
  const summary = [
    `${c.key('Range')}: ${sheet.usedRange ?? '(empty)'}`,
    `${c.key('Grid')}: ${formatNumber(sheet.totalRows)} rows x ${formatNumber(sheet.totalCols)} cols (${formatNumber(sheet.rectangularRangeCellCount)} cells)`,
    `${c.key('Signals')}: ${formatNumber(sheet.formulaCellCount)} formulae | ${formatNumber(sheet.commentCellCount)} comments | ${formatNumber(sheet.hyperlinkCellCount)} hyperlinks | ${formatNumber(sheet.mergedRangeCount)} merges`,
    `${c.key('Layout')}: ${formatNumber(sheet.hiddenRowCount)} hidden rows | ${formatNumber(sheet.hiddenColumnCount)} hidden cols | autofilter=${sheet.autoFilterRef ?? 'none'} | protected=${sheet.protected ? 'yes' : 'no'}`,
    `${c.key('Header')}: ${sheet.headerSelection.rowNumber ?? 'none'} (${sheet.headerSelection.mode})`,
    `${c.key('Token Estimate')}: sample=${formatNumber(sheet.sampleTokenEstimate)} | full=${formatNumber(sheet.fullTokenEstimate)}`,
  ];
  if (sheet.definedNames.length > 0) {
    summary.push(`${c.key('Defined Names')}: ${sheet.definedNames.map(name => `${name.name}=${name.ref}`).join(' | ')}`);
  }
  lines.push(summary.join('\n'));

  if (sheet.schema.columns.length > 0) {
    lines.push(formatSchemaTable(sheet.schema.columns, sheet.schema.truncated, ci));
  } else {
    lines.push(c.dim('No schema columns found.'));
  }

  if (sheet.sample.rows.length > 0) {
    lines.push(formatSampleTable(sheet.sample.rows, sheet.sample.truncatedRows, sheet.sample.truncatedColumns, ci));
  } else {
    lines.push(c.dim('No sample rows found.'));
  }

  const width = Math.max(...lines.map(line => stripAnsi(line.split('\n')[0] ?? '').length), title.length, 40);
  return `${c.header(sectionHeader(title, width, ci))}\n${lines.join('\n\n')}`;
}

function formatSchemaTable(columns: ColumnProfile[], truncated: boolean, ci = false): string {
  const c = palette(ci);
  const table = new Table({
    head: [
      c.key('Col'),
      c.key('Name'),
      c.key('Type'),
      c.key('Non-Empty'),
      c.key('Coverage'),
      c.key('Examples'),
    ],
    chars: tableChars(ci),
    style: { head: [], border: [] },
    colAligns: ['left', 'left', 'left', 'right', 'right', 'left'],
  });

  for (const column of columns) {
    table.push([
      `${column.letter} (${column.index})`,
      column.name,
      column.dominantType,
      formatNumber(column.nonEmptyCount),
      `${Math.round(column.nonEmptyRatio * 100)}%`,
      column.examples.join(' | '),
    ]);
  }

  const suffix = truncated ? '\n(truncated columns)' : '';
  return `${palette(ci).header('Schema')}\n${table.toString()}${suffix}`;
}

function formatSampleTable(rows: SampleRow[], truncatedRows: boolean, truncatedColumns: boolean, ci = false): string {
  const c = palette(ci);
  const columnNames = Object.keys(rows[0]?.values ?? {});
  const table = new Table({
    head: [c.key('Row'), ...columnNames.map(name => c.key(name))],
    chars: tableChars(ci),
    style: { head: [], border: [] },
  });

  for (const row of rows) {
    table.push([String(row.rowNumber), ...columnNames.map(name => row.values[name] ?? '')]);
  }

  const notes: string[] = [];
  if (truncatedRows) notes.push('truncated rows');
  if (truncatedColumns) notes.push('truncated columns');
  const suffix = notes.length > 0 ? `\n(${notes.join(', ')})` : '';
  return `${palette(ci).header('Sample')}\n${table.toString()}${suffix}`;
}
