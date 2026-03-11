import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { inspectDocument } from '../src/doc/inspect.js';
import { formatDocInspection, formatDocPayloadJson } from '../src/doc/output.js';
import { createInspectPayload } from '../src/inspect/shared.js';
import { run } from '../src/cli.js';
import type { DocumentInspection, DocInspectPayload } from '../src/doc/types.js';

const FIXTURES = path.resolve('test/fixtures');

async function captureCli(argv: string[]): Promise<{ stdout: string; stderr: string }> {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: string | Uint8Array, encoding?: BufferEncoding | ((error?: Error | null) => void), cb?: (error?: Error | null) => void) => {
    if (typeof chunk === 'string') {
      stdoutChunks.push(chunk);
    } else {
      // Forward binary writes (test runner protocol) to original
      return originalStdoutWrite(chunk, encoding as BufferEncoding, cb);
    }
    const callback = typeof encoding === 'function' ? encoding : cb;
    if (callback) callback();
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array, encoding?: BufferEncoding | ((error?: Error | null) => void), cb?: (error?: Error | null) => void) => {
    if (typeof chunk === 'string') {
      stderrChunks.push(chunk);
    } else {
      return originalStderrWrite(chunk, encoding as BufferEncoding, cb);
    }
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

test('inspectDocument extracts DOCX metadata and content', async () => {
  const filePath = path.join(FIXTURES, 'sample.docx');
  const result = await inspectDocument(filePath, {
    sampleParagraphs: 5,
    includeStructure: true,
  });

  assert.equal(result.format, 'docx');
  assert.ok(result.size > 0);
  assert.ok(result.contentStats.words > 0);
  assert.ok(result.contentStats.paragraphs > 0);
  assert.ok(result.contentStats.characters > 0);
  assert.equal(result.riskFlags.macros, false);
  assert.ok(result.contentPreview.paragraphs.length > 0);
  assert.ok(result.fullTokenEstimate > 0);
});

test('inspectDocument extracts structure from structured DOCX', async () => {
  const filePath = path.join(FIXTURES, 'structured.docx');
  const result = await inspectDocument(filePath, {
    sampleParagraphs: 5,
    includeStructure: true,
  });

  assert.ok(result.structure);
  assert.ok(result.structure.headingCount > 0);
  assert.ok(result.structure.maxDepth >= 2);
  assert.ok(result.structure.topLevelSections.length > 0);
  assert.ok(result.structure.topLevelSections.includes('Executive Summary'));
  assert.ok(result.structure.tree.length > 0);
});

test('inspectDocument skips structure when includeStructure is false', async () => {
  const filePath = path.join(FIXTURES, 'structured.docx');
  const result = await inspectDocument(filePath, {
    sampleParagraphs: 3,
    includeStructure: false,
  });

  assert.equal(result.structure, null);
  assert.ok(result.contentPreview.paragraphs.length <= 3);
});

test('inspectDocument content preview detects headings', async () => {
  const filePath = path.join(FIXTURES, 'structured.docx');
  const result = await inspectDocument(filePath, {
    sampleParagraphs: 10,
    includeStructure: false,
  });

  const headings = result.contentPreview.paragraphs.filter(p => p.isHeading);
  assert.ok(headings.length > 0);
  assert.ok(headings[0].headingLevel);
});

test('doc inspect JSON payload has correct shape', async () => {
  const filePath = path.join(FIXTURES, 'sample.docx');
  const result = await inspectDocument(filePath, {
    sampleParagraphs: 2,
    includeStructure: false,
  });
  const payload = createInspectPayload(filePath, {
    command: 'doc.inspect',
    sampleParagraphs: 2,
    includeStructure: false,
  }, result) as DocInspectPayload;
  const json = JSON.parse(formatDocPayloadJson(payload)) as {
    file: string;
    query: { command: string };
    results: { format: string; contentStats: { words: number } };
  };

  assert.ok(json.file.includes('sample.docx'));
  assert.equal(json.query.command, 'doc.inspect');
  assert.equal(json.results.format, 'docx');
  assert.ok(json.results.contentStats.words > 0);
});

test('doc inspect tabular output renders expected sections', async () => {
  const filePath = path.join(FIXTURES, 'structured.docx');
  const result = await inspectDocument(filePath, {
    sampleParagraphs: 3,
    includeStructure: true,
  });
  const output = formatDocInspection(result, true);

  assert.match(output, /Content Stats/);
  assert.match(output, /Structure/);
  assert.match(output, /Content Preview/);
  assert.match(output, /Risk Flags/);
  assert.match(output, /Executive Summary/);
});

test('CLI doc inspect emits JSON and tabular output', async () => {
  const filePath = path.join(FIXTURES, 'sample.docx');

  const jsonRun = await captureCli(['doc', 'inspect', filePath, '--format', 'json', '--sample-paragraphs', '2']);
  const payload = JSON.parse(jsonRun.stdout) as {
    query: { command: string };
    results: { format: string; contentPreview: { paragraphs: Array<{ text: string }> } };
  };
  assert.equal(payload.query.command, 'doc.inspect');
  assert.equal(payload.results.format, 'docx');
  assert.ok(payload.results.contentPreview.paragraphs.length > 0);

  const tabularRun = await captureCli(['doc', 'inspect', filePath, '--ci', '--no-structure']);
  assert.match(tabularRun.stdout, /Content Stats/);
  assert.match(tabularRun.stdout, /Content Preview/);
  // No structure section when --no-structure
  assert.doesNotMatch(tabularRun.stdout, /Structure \(/);
});

test('inspectDocument rejects unsupported format', async () => {
  await assert.rejects(
    inspectDocument('test.xlsx', { sampleParagraphs: 5, includeStructure: true }),
    /Unsupported document format/,
  );
});
