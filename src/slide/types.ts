import type { DocumentProperties } from '../inspect/shared.js';

export interface SlideRiskFlags {
  comments: boolean;
  speakerNotes: boolean;
  hyperlinks: boolean;
  embeddedMedia: boolean;
  animations: boolean;
  macros: boolean;
  charts: boolean;
  tables: boolean;
}

export interface SlideProfile {
  index: number;
  title: string | null;
  words: number;
  hasNotes: boolean;
  notePreview: string | null;
  images: number;
  tables: number;
  charts: number;
}

export interface SlideContentStats {
  slides: number;
  words: number;
  slidesWithNotes: number;
  totalImages: number;
  totalTables: number;
  totalCharts: number;
}

export interface SlidePreview {
  truncated: boolean;
  slides: Array<{
    index: number;
    title: string | null;
    textPreview: string;
    hasNotes: boolean;
  }>;
}

export interface PresentationInspection {
  file: string;
  format: 'pptx' | 'odp';
  size: number;
  properties: DocumentProperties;
  riskFlags: SlideRiskFlags;
  contentStats: SlideContentStats;
  slideInventory: SlideProfile[];
  slidePreview: SlidePreview;
  fullTokenEstimate: number;
  previewTokenEstimate: number;
}

export interface SlideInspectPayload {
  file: string;
  query: Record<string, unknown>;
  results: PresentationInspection;
}

export interface InspectSlideOptions {
  sampleSlides: number;
  slide?: number;
}
