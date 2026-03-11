import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, writeFile } from 'node:fs/promises';
import XLSX from 'xlsx';
import { run } from '../src/cli.js';
import { inspectWorkbook, createSheetPayload } from '../src/sheet/inspect.js';
import { formatSheetInspection, formatSheetPayloadJson } from '../src/sheet/output.js';

async function createWorkbookFixture(): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'occ-sheet-'));
  const filePath = path.join(tempDir, 'agent-preflight.xlsx');

  const workbook = XLSX.utils.book_new();
  const overview = XLSX.utils.aoa_to_sheet([
    ['Region', 'Revenue', 'Status', 'Notes', 'Doc', 'AsOf'],
    ['NA', 1200, 'open', 'Review quarterly', 'OpenAI', new Date('2024-01-01T00:00:00Z')],
    ['EU', 980, 'closed', 'Escalate to finance', 'Docs', new Date('2024-02-01T00:00:00Z')],
    ['APAC', 1430, 'open', 'Track backlog', 'Spec', new Date('2024-03-01T00:00:00Z')],
  ]);

  overview['B2'] = { t: 'n', f: 'SUM(1000,200)' };
  overview['C3'] = { t: 's', f: '[Other.xlsx]Sheet1!A1', v: 'linked' };
  overview['D2'].c = [{ a: 'reviewer', t: 'Check assumptions' }];
  overview['E2'].l = { Target: 'https://openai.com/docs', Tooltip: 'Docs' };
  overview['F2'] = { t: 'd', v: new Date('2024-01-01T00:00:00Z') };
  overview['F3'] = { t: 'd', v: new Date('2024-02-01T00:00:00Z') };
  overview['F4'] = { t: 'd', v: new Date('2024-03-01T00:00:00Z') };
  overview['!merges'] = [XLSX.utils.decode_range('A1:B1')];
  overview['!autofilter'] = { ref: 'A1:F4' };
  overview['!rows'] = [];
  overview['!rows'][3] = { hidden: true };
  overview['!cols'] = [];
  overview['!cols'][4] = { hidden: true };

  const archive = XLSX.utils.aoa_to_sheet([
    ['Key', 'Value'],
    ['alpha', '1'],
    ['beta', '2'],
  ]);

  const config = XLSX.utils.aoa_to_sheet([
    ['Setting', 'Value'],
    ['token_budget', '12000'],
  ]);

  XLSX.utils.book_append_sheet(workbook, overview, 'Overview');
  XLSX.utils.book_append_sheet(workbook, archive, 'Archive');
  XLSX.utils.book_append_sheet(workbook, config, 'Config');

  workbook.Workbook = {
    Sheets: [
      { name: 'Overview', Hidden: 0 },
      { name: 'Archive', Hidden: 1 },
      { name: 'Config', Hidden: 2 },
    ],
    Names: [
      { Name: 'GlobalRevenue', Ref: 'Overview!$B$2:$B$4' },
      { Name: 'ArchiveKeys', Ref: 'Archive!$A$2:$A$3', Sheet: 1 },
    ],
  };
  workbook.Props = {
    Title: 'Agent Workbook',
    Author: 'OCC',
    Company: 'OpenAI',
    CreatedDate: new Date('2024-01-01T00:00:00Z'),
  };
  workbook.Custprops = { Domain: 'FinanceOps' };

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  await writeFile(filePath, buffer);
  return filePath;
}

async function captureCli(argv: string[]): Promise<{ stdout: string; stderr: string }> {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: string | Uint8Array, encoding?: BufferEncoding | ((error?: Error | null) => void), cb?: (error?: Error | null) => void) => {
    stdoutChunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString(typeof encoding === 'string' ? encoding : 'utf8'));
    const callback = typeof encoding === 'function' ? encoding : cb;
    if (callback) callback();
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array, encoding?: BufferEncoding | ((error?: Error | null) => void), cb?: (error?: Error | null) => void) => {
    stderrChunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString(typeof encoding === 'string' ? encoding : 'utf8'));
    const callback = typeof encoding === 'function' ? encoding : cb;
    if (callback) callback();
    return true;
  }) as typeof process.stderr.write;

  try {
    await run(['node', 'occ', ...argv]);
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  return {
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
  };
}

test('inspectWorkbook captures workbook and sheet preflight signals', async () => {
  const filePath = await createWorkbookFixture();
  const result = await inspectWorkbook(filePath, {
    sampleRows: 2,
    headerRow: 'auto',
    maxColumns: 4,
  });

  assert.equal(result.workbook.sheetCount, 3);
  assert.equal(result.workbook.hiddenSheetCount, 1);
  assert.equal(result.workbook.veryHiddenSheetCount, 1);
  assert.equal(result.workbook.properties.title, 'Agent Workbook');
  assert.equal(result.workbook.customPropertyCount, 1);
  assert.deepEqual(result.workbook.definedNames.map(name => name.name), ['GlobalRevenue']);
  assert.equal(result.workbook.riskFlags.hiddenSheets, true);
  assert.equal(result.workbook.riskFlags.formulas, true);
  assert.equal(result.workbook.riskFlags.comments, true);
  assert.equal(result.workbook.riskFlags.hyperlinks, true);
  assert.equal(result.workbook.riskFlags.mergedCells, true);
  assert.equal(result.workbook.riskFlags.externalFormulaRefs, true);

  const overview = result.sheets.find(sheet => sheet.name === 'Overview');
  assert(overview);
  assert.equal(overview.visibility, 'visible');
  assert.equal(overview.formulaCellCount, 2);
  assert.equal(overview.commentCellCount, 1);
  assert.equal(overview.hyperlinkCellCount, 1);
  assert.equal(overview.mergedRangeCount, 1);
  assert.equal(overview.hiddenRowCount, 1);
  assert.equal(overview.hiddenColumnCount, 1);
  assert.equal(overview.autoFilterRef, 'A1:F4');
  assert.equal(overview.externalFormulaRefCount, 1);
  assert.equal(overview.headerSelection.rowNumber, 1);
  assert.equal(overview.schema.truncated, true);
  assert.deepEqual(overview.schema.columns.map(column => column.name), ['Region', 'Revenue', 'Status', 'Notes']);
  assert.equal(overview.sample.rows.length, 2);
  assert.equal(overview.sample.rows[0]?.rowNumber, 2);
  assert.equal(overview.sample.rows[0]?.values.Region, 'NA');
  assert.equal(overview.sample.truncatedColumns, true);

  const archive = result.sheets.find(sheet => sheet.name === 'Archive');
  assert(archive);
  assert.equal(archive.visibility, 'hidden');
  assert.deepEqual(archive.definedNames.map(name => name.name), ['ArchiveKeys']);
});

test('inspectWorkbook supports sheet selection and header overrides', async () => {
  const filePath = await createWorkbookFixture();
  const result = await inspectWorkbook(filePath, {
    sheet: '2',
    sampleRows: 5,
    headerRow: 'none',
    maxColumns: 10,
  });

  assert.equal(result.sheets.length, 1);
  assert.equal(result.sheets[0]?.name, 'Archive');
  assert.equal(result.sheets[0]?.headerSelection.rowNumber, null);
  assert.deepEqual(result.sheets[0]?.schema.columns.map(column => column.name), ['A', 'B']);
});

test('sheet inspect JSON payload stays stable', async () => {
  const filePath = await createWorkbookFixture();
  const result = await inspectWorkbook(filePath, {
    sampleRows: 1,
    headerRow: 1,
    maxColumns: 3,
  });
  const payload = JSON.parse(formatSheetPayloadJson(createSheetPayload(filePath, {
    command: 'sheet.inspect',
    sampleRows: 1,
    headerRow: 1,
    maxColumns: 3,
  }, result))) as {
    file: string;
    query: { command: string; sampleRows: number; headerRow: number; maxColumns: number };
    results: { workbook: { format: string; sheetCount: number }; sheets: Array<{ name: string; schema: { truncated: boolean } }> };
  };

  assert.equal(payload.file, filePath);
  assert.equal(payload.query.command, 'sheet.inspect');
  assert.equal(payload.query.sampleRows, 1);
  assert.equal(payload.results.workbook.format, 'xlsx');
  assert.equal(payload.results.workbook.sheetCount, 3);
  assert.equal(payload.results.sheets[0]?.schema.truncated, true);
});

test('sheet inspect tabular output renders inventory, schema, and sample sections', async () => {
  const filePath = await createWorkbookFixture();
  const result = await inspectWorkbook(filePath, {
    sampleRows: 1,
    headerRow: 'auto',
    maxColumns: 3,
  });
  const output = formatSheetInspection(result, true);

  assert.match(output, /Sheet Inventory/);
  assert.match(output, /Sheet: Overview \(visible\)/);
  assert.match(output, /Schema/);
  assert.match(output, /Sample/);
  assert.match(output, /Risk Flags: .*hiddenSheets/);
});

test('CLI sheet inspect emits JSON and tabular output', async () => {
  const filePath = await createWorkbookFixture();
  const jsonRun = await captureCli(['sheet', 'inspect', filePath, '--format', 'json', '--sample-rows', '1', '--max-columns', '3']);
  const payload = JSON.parse(jsonRun.stdout) as {
    query: { command: string };
    results: { sheets: Array<{ name: string; sample: { rows: Array<{ rowNumber: number }> } }> };
  };

  assert.equal(payload.query.command, 'sheet.inspect');
  assert.equal(payload.results.sheets[0]?.name, 'Overview');
  assert.equal(payload.results.sheets[0]?.sample.rows[0]?.rowNumber, 2);

  const tabularRun = await captureCli(['sheet', 'inspect', filePath, '--ci', '--sheet', 'Archive', '--header-row', 'none']);
  assert.match(tabularRun.stdout, /Sheet: Archive \(hidden\)/);
  assert.match(tabularRun.stdout, /Header: none \(none\)/);
});
