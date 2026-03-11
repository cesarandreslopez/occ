import chalk from 'chalk';
import { formatBytes, formatNumber } from '../utils.js';
import { sectionHeader, stripAnsi } from '../output/tabular.js';
import type { DocumentInspection, DocInspectPayload } from './types.js';

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

export function formatDocPayloadJson(payload: DocInspectPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function formatDocInspection(result: DocumentInspection, ci = false): string {
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
  const pagesLabel = result.contentStats.pagesEstimated ? ' (estimated)' : '';
  const statsLines = [
    `  ${c.key('Words')}: ${formatNumber(result.contentStats.words)}        ${c.key('Pages')}: ${formatNumber(result.contentStats.pages)}${pagesLabel}`,
    `  ${c.key('Paragraphs')}: ${formatNumber(result.contentStats.paragraphs)}     ${c.key('Characters')}: ${formatNumber(result.contentStats.characters)}`,
    `  ${c.key('Tables')}: ${formatNumber(result.contentStats.tables)}           ${c.key('Images')}: ${formatNumber(result.contentStats.images)}`,
    `  ${c.key('Token Estimate')}: preview=${formatNumber(result.previewTokenEstimate)} | full=${formatNumber(result.fullTokenEstimate)}`,
  ];

  const statsWidth = Math.max(...statsLines.map(line => stripAnsi(line).length), 56);
  sections.push(`${c.header(sectionHeader('Content Stats', statsWidth, ci))}\n${statsLines.join('\n')}`);

  // Structure
  if (result.structure) {
    const structLines: string[] = [];
    for (const node of result.structure.tree) {
      formatTreeNode(node, structLines, '');
    }
    const structTitle = `Structure (${result.structure.headingCount} headings, depth ${result.structure.maxDepth})`;
    const structWidth = Math.max(...structLines.map(line => line.length), structTitle.length + 6, 56);
    sections.push(`${c.header(sectionHeader(structTitle, structWidth, ci))}\n${structLines.join('\n')}`);
  }

  // Content Preview
  if (result.contentPreview.paragraphs.length > 0) {
    const previewLines: string[] = [];
    for (const p of result.contentPreview.paragraphs) {
      if (p.isHeading) {
        previewLines.push(`  ${c.key(`[H${p.headingLevel}]`)} ${p.text}`);
      } else {
        previewLines.push(`  ${p.text.length > 120 ? p.text.slice(0, 120) + '...' : p.text}`);
      }
    }
    if (result.contentPreview.truncated) {
      const remainingWords = result.contentStats.words - result.contentPreview.paragraphs.reduce(
        (sum, p) => sum + p.text.split(/\s+/).length, 0,
      );
      const remainingParas = result.contentStats.paragraphs - result.contentPreview.paragraphs.length;
      previewLines.push(c.dim(`  (${remainingParas} more paragraphs, ~${formatNumber(remainingWords)} remaining words)`));
    }
    const previewWidth = Math.max(...previewLines.map(line => stripAnsi(line).length), 56);
    sections.push(`${c.header(sectionHeader('Content Preview', previewWidth, ci))}\n${previewLines.join('\n')}`);
  }

  return sections.join('\n\n') + '\n';
}

function formatTreeNode(node: { structureCode?: string; title: string; children: typeof node[] }, lines: string[], indent: string): void {
  lines.push(`  ${indent}${node.structureCode ?? ''}   ${node.title}`);
  for (const child of node.children) {
    formatTreeNode(child, lines, indent + '  ');
  }
}
