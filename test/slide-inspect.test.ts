import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { inspectPresentation } from '../src/slide/inspect.js';
import { formatSlideInspection, formatSlidePayloadJson } from '../src/slide/output.js';
import { createInspectPayload } from '../src/inspect/shared.js';
import { run } from '../src/cli.js';
import type { SlideInspectPayload } from '../src/slide/types.js';

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

test('inspectPresentation extracts PPTX metadata and slides', async () => {
  const filePath = path.join(FIXTURES, 'sample.pptx');
  const result = await inspectPresentation(filePath, {
    sampleSlides: 3,
  });

  assert.equal(result.format, 'pptx');
  assert.ok(result.size > 0);
  assert.equal(result.contentStats.slides, 3);
  assert.ok(result.contentStats.words > 0);
  assert.equal(result.properties.title, 'Test Presentation');
  assert.equal(result.properties.author, 'Test Author');
  assert.equal(result.properties.company, 'Test Corp');
});

test('inspectPresentation captures per-slide profiles', async () => {
  const filePath = path.join(FIXTURES, 'sample.pptx');
  const result = await inspectPresentation(filePath, {
    sampleSlides: 3,
  });

  assert.equal(result.slideInventory.length, 3);

  const slide1 = result.slideInventory[0];
  assert.equal(slide1.index, 1);
  assert.equal(slide1.title, 'Welcome to Testing');
  assert.ok(slide1.words > 0);
  assert.equal(slide1.hasNotes, true);
  assert.ok(slide1.notePreview);
  assert.match(slide1.notePreview!, /greet the audience/);
});

test('inspectPresentation detects risk flags', async () => {
  const filePath = path.join(FIXTURES, 'sample.pptx');
  const result = await inspectPresentation(filePath, {
    sampleSlides: 3,
  });

  assert.equal(result.riskFlags.speakerNotes, true);
  assert.equal(result.riskFlags.animations, true);
  assert.equal(result.riskFlags.tables, true);
  assert.equal(result.riskFlags.macros, false);
  assert.equal(result.riskFlags.comments, false);
});

test('inspectPresentation filters to specific slide', async () => {
  const filePath = path.join(FIXTURES, 'sample.pptx');
  const result = await inspectPresentation(filePath, {
    sampleSlides: 3,
    slide: 2,
  });

  assert.equal(result.slideInventory.length, 1);
  assert.equal(result.slideInventory[0].title, 'Test Results Overview');
  assert.equal(result.slideInventory[0].tables, 1);
  // contentStats still covers the full presentation
  assert.equal(result.contentStats.slides, 3);
});

test('inspectPresentation rejects out-of-range slide', async () => {
  const filePath = path.join(FIXTURES, 'sample.pptx');
  await assert.rejects(
    inspectPresentation(filePath, { sampleSlides: 3, slide: 99 }),
    /out of range/,
  );
});

test('slide inspect JSON payload has correct shape', async () => {
  const filePath = path.join(FIXTURES, 'sample.pptx');
  const result = await inspectPresentation(filePath, { sampleSlides: 2 });
  const payload = createInspectPayload(filePath, {
    command: 'slide.inspect',
    sampleSlides: 2,
  }, result) as SlideInspectPayload;
  const json = JSON.parse(formatSlidePayloadJson(payload)) as {
    file: string;
    query: { command: string };
    results: { format: string; contentStats: { slides: number } };
  };

  assert.ok(json.file.includes('sample.pptx'));
  assert.equal(json.query.command, 'slide.inspect');
  assert.equal(json.results.format, 'pptx');
  assert.equal(json.results.contentStats.slides, 3);
});

test('slide inspect tabular output renders expected sections', async () => {
  const filePath = path.join(FIXTURES, 'sample.pptx');
  const result = await inspectPresentation(filePath, { sampleSlides: 3 });
  const output = formatSlideInspection(result, true);

  assert.match(output, /Content Stats/);
  assert.match(output, /Slide Inventory/);
  assert.match(output, /Slide Preview/);
  assert.match(output, /Risk Flags/);
  assert.match(output, /Welcome to Testing/);
});

test('CLI slide inspect emits JSON and tabular output', async () => {
  const filePath = path.join(FIXTURES, 'sample.pptx');

  const jsonRun = await captureCli(['slide', 'inspect', filePath, '--format', 'json', '--sample-slides', '2']);
  const payload = JSON.parse(jsonRun.stdout) as {
    query: { command: string };
    results: { format: string; slideInventory: Array<{ title: string | null }> };
  };
  assert.equal(payload.query.command, 'slide.inspect');
  assert.equal(payload.results.format, 'pptx');
  assert.ok(payload.results.slideInventory.length > 0);

  const tabularRun = await captureCli(['slide', 'inspect', filePath, '--ci', '--slide', '1']);
  assert.match(tabularRun.stdout, /Slide Inventory/);
  assert.match(tabularRun.stdout, /Welcome to Testing/);
});

test('inspectPresentation rejects unsupported format', async () => {
  await assert.rejects(
    inspectPresentation('test.docx', { sampleSlides: 3 }),
    /Unsupported presentation format/,
  );
});
