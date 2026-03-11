import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { countWords } from '../utils.js';
import { asOptionalString, formatDateLike } from '../inspect/shared.js';
import type { DocumentProperties } from '../inspect/shared.js';
import type { DocRiskFlags, DocContentStats, ContentPreview } from './types.js';

function parseXmlText(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match?.[1]?.trim() || undefined;
}

export async function extractDocxProperties(zip: JSZip): Promise<DocumentProperties> {
  const props: DocumentProperties = {};

  const coreXml = await zip.file('docProps/core.xml')?.async('text');
  if (coreXml) {
    props.title = asOptionalString(parseXmlText(coreXml, 'dc:title'));
    props.subject = asOptionalString(parseXmlText(coreXml, 'dc:subject'));
    props.author = asOptionalString(parseXmlText(coreXml, 'dc:creator'));
    props.keywords = asOptionalString(parseXmlText(coreXml, 'cp:keywords'));
    props.lastModifiedBy = asOptionalString(parseXmlText(coreXml, 'cp:lastModifiedBy'));
    props.createdDate = formatDateLike(parseXmlText(coreXml, 'dcterms:created'));
    props.modifiedDate = formatDateLike(parseXmlText(coreXml, 'dcterms:modified'));
  }

  const appXml = await zip.file('docProps/app.xml')?.async('text');
  if (appXml) {
    props.company = asOptionalString(parseXmlText(appXml, 'Company'));
  }

  return props;
}

export async function extractDocxRiskFlags(zip: JSZip): Promise<DocRiskFlags> {
  const flags: DocRiskFlags = {
    comments: false,
    trackedChanges: false,
    hyperlinks: false,
    embeddedObjects: false,
    footnotes: false,
    endnotes: false,
    macros: false,
    headerFooter: false,
    tables: false,
    encrypted: false,
  };

  // Check comments
  const commentsXml = await zip.file('word/comments.xml')?.async('text');
  if (commentsXml && /<w:comment\b/.test(commentsXml)) {
    flags.comments = true;
  }

  // Check document.xml for tracked changes, tables, hyperlinks
  const docXml = await zip.file('word/document.xml')?.async('text');
  if (docXml) {
    if (/<w:ins\b/.test(docXml) || /<w:del\b/.test(docXml)) flags.trackedChanges = true;
    if (/<w:tbl\b/.test(docXml)) flags.tables = true;
    if (/<w:hyperlink\b/.test(docXml)) flags.hyperlinks = true;
  }

  // Check for macros
  if (zip.file('word/vbaProject.bin')) flags.macros = true;

  // Check for images
  const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('word/media/'));
  if (mediaFiles.length > 0) flags.embeddedObjects = true;

  // Check footnotes/endnotes
  const footnotesXml = await zip.file('word/footnotes.xml')?.async('text');
  if (footnotesXml && /<w:footnote\b/.test(footnotesXml)) {
    // Word always has footnotes.xml with separator/continuationSeparator; check for actual footnotes
    const realFootnotes = (footnotesXml.match(/<w:footnote\b/g) || []).length;
    if (realFootnotes > 2) flags.footnotes = true; // skip the 2 built-in
  }

  const endnotesXml = await zip.file('word/endnotes.xml')?.async('text');
  if (endnotesXml && /<w:endnote\b/.test(endnotesXml)) {
    const realEndnotes = (endnotesXml.match(/<w:endnote\b/g) || []).length;
    if (realEndnotes > 2) flags.endnotes = true;
  }

  // Check headers/footers
  const headerFiles = Object.keys(zip.files).filter(name => /^word\/(header|footer)\d*\.xml$/.test(name));
  if (headerFiles.length > 0) flags.headerFooter = true;

  return flags;
}

export async function extractDocxContentStats(filePath: string, zip: JSZip): Promise<DocContentStats> {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value || '';
  const words = countWords(text);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
  const characters = text.length;

  // Pages from app.xml if available
  const appXml = await zip.file('docProps/app.xml')?.async('text');
  let pages = 0;
  let pagesEstimated = true;
  if (appXml) {
    const pagesStr = parseXmlText(appXml, 'Pages');
    if (pagesStr) {
      const parsed = parseInt(pagesStr, 10);
      if (parsed > 0) {
        pages = parsed;
        pagesEstimated = false;
      }
    }
  }
  if (pages === 0) {
    pages = Math.max(1, Math.ceil(words / 250));
    pagesEstimated = true;
  }

  // Count tables from HTML conversion
  let tables = 0;
  try {
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    const html = htmlResult.value || '';
    tables = (html.match(/<table\b/gi) || []).length;
  } catch { /* ignore */ }

  // Count images
  const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('word/media/'));
  const images = mediaFiles.length;

  return { words, pages, pagesEstimated, paragraphs, characters, tables, images };
}

export async function extractDocxPreview(filePath: string, sampleParagraphs: number): Promise<ContentPreview> {
  const result = await mammoth.convertToHtml({ path: filePath });
  const html = result.value || '';

  if (!html.trim()) {
    return { truncated: false, paragraphs: [] };
  }

  // Use turndown to convert to markdown for heading detection
  const TurndownService = (await import('turndown')).default;
  const turndown = new TurndownService({ headingStyle: 'atx' });
  const markdown = turndown.turndown(html);

  return buildPreviewFromMarkdown(markdown, sampleParagraphs);
}

export function buildPreviewFromMarkdown(markdown: string, sampleParagraphs: number): ContentPreview {
  const lines = markdown.split('\n');
  const previews: ContentPreview['paragraphs'] = [];
  let paragraphIndex = 0;

  let i = 0;
  while (i < lines.length && previews.length < sampleParagraphs) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      previews.push({
        index: paragraphIndex,
        text: headingMatch[2],
        isHeading: true,
        headingLevel: headingMatch[1].length,
      });
    } else {
      // Collect contiguous non-empty lines as one paragraph
      let text = line;
      while (i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].trim().match(/^#{1,6}\s/)) {
        i++;
        text += ' ' + lines[i].trim();
      }
      previews.push({
        index: paragraphIndex,
        text,
        isHeading: false,
      });
    }
    paragraphIndex++;
    i++;
  }

  // Check for remaining content
  let hasMore = false;
  for (let j = i; j < lines.length; j++) {
    if (lines[j].trim()) {
      hasMore = true;
      break;
    }
  }

  return { truncated: hasMore, paragraphs: previews };
}

export async function inspectDocx(
  filePath: string,
  buffer: Buffer,
  sampleParagraphs: number,
): Promise<{
  properties: DocumentProperties;
  riskFlags: DocRiskFlags;
  contentStats: DocContentStats;
  preview: ContentPreview;
}> {
  const zip = await JSZip.loadAsync(buffer);
  const [properties, riskFlags, contentStats, preview] = await Promise.all([
    extractDocxProperties(zip),
    extractDocxRiskFlags(zip),
    extractDocxContentStats(filePath, zip),
    extractDocxPreview(filePath, sampleParagraphs),
  ]);

  return { properties, riskFlags, contentStats, preview };
}
