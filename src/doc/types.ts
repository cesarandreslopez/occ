import type { DocumentProperties } from '../inspect/shared.js';
import type { StructureNode } from '../structure/types.js';

export interface DocRiskFlags {
  comments: boolean;
  trackedChanges: boolean;
  hyperlinks: boolean;
  embeddedObjects: boolean;
  footnotes: boolean;
  endnotes: boolean;
  macros: boolean;
  headerFooter: boolean;
  tables: boolean;
  encrypted: boolean;
}

export interface DocContentStats {
  words: number;
  pages: number;
  pagesEstimated: boolean;
  paragraphs: number;
  characters: number;
  tables: number;
  images: number;
}

export interface StructureSummary {
  headingCount: number;
  maxDepth: number;
  topLevelSections: string[];
  tree: StructureNode[];
}

export interface ContentPreview {
  truncated: boolean;
  paragraphs: Array<{
    index: number;
    text: string;
    isHeading: boolean;
    headingLevel?: number;
  }>;
}

export interface DocumentInspection {
  file: string;
  format: 'docx' | 'pdf' | 'odt';
  size: number;
  properties: DocumentProperties;
  riskFlags: DocRiskFlags;
  contentStats: DocContentStats;
  structure: StructureSummary | null;
  contentPreview: ContentPreview;
  fullTokenEstimate: number;
  previewTokenEstimate: number;
}

export interface DocInspectPayload {
  file: string;
  query: Record<string, unknown>;
  results: DocumentInspection;
}

export interface InspectDocOptions {
  sampleParagraphs: number;
  includeStructure: boolean;
}
