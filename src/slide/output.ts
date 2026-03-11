import Table from 'cli-table3';
import chalk from 'chalk';
import { formatBytes, formatNumber } from '../utils.js';
import { sectionHeader, stripAnsi, tableChars } from '../output/tabular.js';
import type { PresentationInspection, SlideInspectPayload } from './types.js';

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

export function formatSlidePayloadJson(payload: SlideInspectPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function formatSlideInspection(result: PresentationInspection, ci = false): string {
  const c = palette(ci);
  const sections: string[] = [];

  // Overview
  const overviewLines = [
    `${c.key('File')}: ${c.value(result.file)}`,
    `${c.key('Format')}: ${c.value(result.format.toUpperCase())}`,
    `${c.key('Size')}: ${c.value(formatBytes(result.size))}`,
  ];

  const propEntries = Object.entries(result.properties).filter(([, value]) => value);
  if (propEntries.length > 0) {
    overviewLines.push(`${c.key('Properties')}: ${propEntries.map(([key, value]) => `${key}=${value}`).join(' | ')}`);
  }

  const riskFlags = Object.entries(result.riskFlags).filter(([, enabled]) => enabled).map(([key]) => key);
  overviewLines.push(`${c.key('Risk Flags')}: ${riskFlags.length > 0 ? c.warn(riskFlags.join(', ')) : c.ok('none')}`);

  sections.push(overviewLines.join('\n'));

  // Content Stats
  const statsLines = [
    `  ${c.key('Slides')}: ${formatNumber(result.contentStats.slides)}           ${c.key('Words')}: ${formatNumber(result.contentStats.words)}`,
    `  ${c.key('Slides with Notes')}: ${formatNumber(result.contentStats.slidesWithNotes)}`,
    `  ${c.key('Images')}: ${formatNumber(result.contentStats.totalImages)}           ${c.key('Tables')}: ${formatNumber(result.contentStats.totalTables)}          ${c.key('Charts')}: ${formatNumber(result.contentStats.totalCharts)}`,
    `  ${c.key('Token Estimate')}: preview=${formatNumber(result.previewTokenEstimate)} | full=${formatNumber(result.fullTokenEstimate)}`,
  ];

  const statsWidth = Math.max(...statsLines.map(line => stripAnsi(line).length), 56);
  sections.push(`${c.header(sectionHeader('Content Stats', statsWidth, ci))}\n${statsLines.join('\n')}`);

  // Slide Inventory
  if (result.slideInventory.length > 0) {
    const table = new Table({
      head: [
        c.key('#'),
        c.key('Title'),
        c.key('Words'),
        c.key('Notes'),
        c.key('Images'),
        c.key('Tables'),
      ],
      chars: tableChars(ci),
      style: { head: [], border: [] },
      colAligns: ['right', 'left', 'right', 'left', 'right', 'right'],
    });

    for (const slide of result.slideInventory) {
      table.push([
        String(slide.index),
        slide.title || c.dim('(untitled)'),
        formatNumber(slide.words),
        slide.hasNotes ? 'yes' : '',
        formatNumber(slide.images),
        formatNumber(slide.tables),
      ]);
    }

    const rendered = table.toString();
    const width = stripAnsi(rendered.split('\n')[0] ?? '').length;
    sections.push(`${c.header(sectionHeader('Slide Inventory', width, ci))}\n${rendered}`);
  }

  // Slide Preview
  if (result.slidePreview.slides.length > 0) {
    const previewLines: string[] = [];
    for (const slide of result.slidePreview.slides) {
      previewLines.push(`  ${c.key(`--- Slide ${slide.index}: ${slide.title || '(untitled)'} ---`)}`);
      if (slide.textPreview) {
        previewLines.push(`  ${slide.textPreview.length > 300 ? slide.textPreview.slice(0, 300) + '...' : slide.textPreview}`);
      }
    }
    if (result.slidePreview.truncated) {
      const remaining = result.contentStats.slides - result.slidePreview.slides.length;
      previewLines.push(c.dim(`  (${remaining} more slides)`));
    }
    const previewWidth = Math.max(...previewLines.map(line => stripAnsi(line).length), 56);
    sections.push(`${c.header(sectionHeader('Slide Preview', previewWidth, ci))}\n${previewLines.join('\n')}`);
  }

  return sections.join('\n\n') + '\n';
}
