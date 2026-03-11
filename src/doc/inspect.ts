import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { getExtension } from '../utils.js';
import { estimateTokens } from '../inspect/shared.js';
import { documentToMarkdown } from '../markdown/convert.js';
import { extractFromMarkdown } from '../structure/index.js';
import { inspectDocx } from './inspect-docx.js';
import { inspectPdf } from './inspect-pdf.js';
import { inspectOdt } from './inspect-odt.js';
import type { DocumentInspection, InspectDocOptions, StructureSummary } from './types.js';

const SUPPORTED_EXTENSIONS = new Set(['docx', 'pdf', 'odt']);

export async function inspectDocument(filePath: string, options: InspectDocOptions): Promise<DocumentInspection> {
  const resolvedPath = path.resolve(filePath);
  const ext = getExtension(resolvedPath);
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported document format: .${ext || '(none)'} (expected .docx, .pdf, or .odt)`);
  }

  const buffer = await readFile(resolvedPath);
  const format = ext as 'docx' | 'pdf' | 'odt';

  let result: Awaited<ReturnType<typeof inspectDocx>>;
  switch (format) {
    case 'docx':
      result = await inspectDocx(resolvedPath, buffer, options.sampleParagraphs);
      break;
    case 'pdf':
      result = await inspectPdf(resolvedPath, buffer, options.sampleParagraphs);
      break;
    case 'odt':
      result = await inspectOdt(resolvedPath, buffer, options.sampleParagraphs);
      break;
  }

  // Structure extraction
  let structure: StructureSummary | null = null;
  if (options.includeStructure) {
    try {
      const markdown = await documentToMarkdown(resolvedPath);
      if (markdown) {
        const docStructure = extractFromMarkdown(markdown);
        if (docStructure.totalNodes > 0) {
          const topLevelSections = docStructure.rootNodes.map(n => n.title);
          structure = {
            headingCount: docStructure.totalNodes,
            maxDepth: docStructure.maxDepth,
            topLevelSections,
            tree: docStructure.rootNodes,
          };
        }
      }
    } catch { /* structure extraction is best-effort */ }
  }

  // Token estimates
  const fullText = [
    result.preview.paragraphs.map(p => p.text).join(' '),
  ].join(' ');
  const fullTokenEstimate = estimateTokens(result.contentStats.characters);
  const previewTokenEstimate = estimateTokens(
    result.preview.paragraphs.reduce((sum, p) => sum + p.text.length, 0),
  );

  return {
    file: resolvedPath,
    format,
    size: buffer.length,
    properties: result.properties,
    riskFlags: result.riskFlags,
    contentStats: result.contentStats,
    structure,
    contentPreview: result.preview,
    fullTokenEstimate,
    previewTokenEstimate,
  };
}
