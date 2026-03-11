import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { getExtension } from '../utils.js';
import { estimateTokens } from '../inspect/shared.js';
import { inspectPptx } from './inspect-pptx.js';
import { inspectOdp } from './inspect-odp.js';
import type { PresentationInspection, InspectSlideOptions, SlideContentStats, SlidePreview } from './types.js';

const SUPPORTED_EXTENSIONS = new Set(['pptx', 'odp']);

export async function inspectPresentation(filePath: string, options: InspectSlideOptions): Promise<PresentationInspection> {
  const resolvedPath = path.resolve(filePath);
  const ext = getExtension(resolvedPath);
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported presentation format: .${ext || '(none)'} (expected .pptx or .odp)`);
  }

  const buffer = await readFile(resolvedPath);
  const format = ext as 'pptx' | 'odp';

  let result: Awaited<ReturnType<typeof inspectPptx>>;
  switch (format) {
    case 'pptx':
      result = await inspectPptx(buffer);
      break;
    case 'odp':
      result = await inspectOdp(buffer);
      break;
  }

  // Filter to specific slide if requested
  let slideProfiles = result.slideProfiles;
  if (options.slide) {
    const slideIndex = options.slide;
    if (slideIndex < 1 || slideIndex > slideProfiles.length) {
      throw new Error(`Slide ${slideIndex} out of range (1-${slideProfiles.length})`);
    }
    slideProfiles = [slideProfiles[slideIndex - 1]];
  }

  // Compute content stats
  const contentStats: SlideContentStats = {
    slides: result.slideProfiles.length,
    words: result.slideProfiles.reduce((sum, p) => sum + p.words, 0),
    slidesWithNotes: result.slideProfiles.filter(p => p.hasNotes).length,
    totalImages: result.slideProfiles.reduce((sum, p) => sum + p.images, 0),
    totalTables: result.slideProfiles.reduce((sum, p) => sum + p.tables, 0),
    totalCharts: result.slideProfiles.reduce((sum, p) => sum + p.charts, 0),
  };

  // Build slide preview
  const previewSlides = slideProfiles.slice(0, options.sampleSlides);
  const slidePreview: SlidePreview = {
    truncated: slideProfiles.length > options.sampleSlides,
    slides: previewSlides.map(p => ({
      index: p.index,
      title: p.title,
      textPreview: p.notePreview ? `[Notes] ${p.notePreview}` : '',
      hasNotes: p.hasNotes,
    })),
  };

  // Token estimates
  const allText = result.slideProfiles.map(p => {
    let text = p.title || '';
    if (p.notePreview) text += ' ' + p.notePreview;
    return text;
  }).join(' ');
  const fullTokenEstimate = estimateTokens(allText.length + contentStats.words * 5);
  const previewTokenEstimate = estimateTokens(
    slidePreview.slides.reduce((sum, s) => sum + (s.title?.length || 0) + s.textPreview.length, 0),
  );

  return {
    file: resolvedPath,
    format,
    size: buffer.length,
    properties: result.properties,
    riskFlags: result.riskFlags,
    contentStats,
    slideInventory: slideProfiles,
    slidePreview,
    fullTokenEstimate,
    previewTokenEstimate,
  };
}
