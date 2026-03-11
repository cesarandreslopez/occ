import JSZip from 'jszip';
import { countWords } from '../utils.js';
import { asOptionalString, formatDateLike } from '../inspect/shared.js';
import type { DocumentProperties } from '../inspect/shared.js';
import type { SlideRiskFlags, SlideProfile } from './types.js';

function parseXmlText(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match?.[1]?.trim() || undefined;
}

function extractTextFromElement(xml: string): string {
  const matches = xml.match(/<text:(?:p|span)[^>]*>([^<]*)<\/text:(?:p|span)>/g) || [];
  const texts: string[] = [];
  for (const m of matches) {
    const text = m.replace(/<[^>]+>/g, '').trim();
    if (text) texts.push(text);
  }
  return texts.join(' ');
}

export async function inspectOdp(
  buffer: Buffer,
): Promise<{
  properties: DocumentProperties;
  riskFlags: SlideRiskFlags;
  slideProfiles: SlideProfile[];
}> {
  const zip = await JSZip.loadAsync(buffer);

  // Parse metadata
  const properties: DocumentProperties = {};
  const metaXml = await zip.file('meta.xml')?.async('text');
  if (metaXml) {
    properties.title = asOptionalString(parseXmlText(metaXml, 'dc:title'));
    properties.subject = asOptionalString(parseXmlText(metaXml, 'dc:subject'));
    properties.author = asOptionalString(parseXmlText(metaXml, 'dc:creator') ?? parseXmlText(metaXml, 'meta:initial-creator'));
    properties.keywords = asOptionalString(parseXmlText(metaXml, 'meta:keyword'));
    properties.createdDate = formatDateLike(parseXmlText(metaXml, 'meta:creation-date'));
    properties.modifiedDate = formatDateLike(parseXmlText(metaXml, 'dc:date'));
  }

  // Parse content.xml for slides
  const contentXml = await zip.file('content.xml')?.async('text');
  const slideProfiles: SlideProfile[] = [];

  const riskFlags: SlideRiskFlags = {
    comments: false,
    speakerNotes: false,
    hyperlinks: false,
    embeddedMedia: false,
    animations: false,
    macros: false,
    charts: false,
    tables: false,
  };

  if (contentXml) {
    // Split by draw:page elements
    const slideMatches = contentXml.match(/<draw:page\b[^>]*>[\s\S]*?<\/draw:page>/g) || [];

    for (let i = 0; i < slideMatches.length; i++) {
      const slideXml = slideMatches[i];

      // Get title from draw:name attribute or first text frame
      let title: string | null = null;
      const nameMatch = slideXml.match(/draw:name="([^"]*)"/);
      if (nameMatch && nameMatch[1]) {
        title = nameMatch[1];
      }

      // Extract text
      const text = extractTextFromElement(slideXml);
      const words = countWords(text);

      // Count tables and images
      const tables = (slideXml.match(/<table:table\b/g) || []).length;
      const images = (slideXml.match(/<draw:image\b/g) || []).length;

      // Check for notes
      let hasNotes = false;
      let notePreview: string | null = null;
      const notesMatch = slideXml.match(/<presentation:notes\b[^>]*>([\s\S]*?)<\/presentation:notes>/);
      if (notesMatch) {
        const notesText = extractTextFromElement(notesMatch[1]);
        if (notesText.trim()) {
          hasNotes = true;
          notePreview = notesText.length > 200 ? notesText.slice(0, 200) + '...' : notesText;
        }
      }

      slideProfiles.push({
        index: i + 1,
        title,
        words,
        hasNotes,
        notePreview,
        images,
        tables,
        charts: 0,
      });
    }

    // Risk flags
    if (/<office:annotation\b/.test(contentXml)) riskFlags.comments = true;
    if (slideProfiles.some(p => p.hasNotes)) riskFlags.speakerNotes = true;
    if (/<text:a\b[^>]*xlink:href=/.test(contentXml)) riskFlags.hyperlinks = true;
    if (/<draw:image\b/.test(contentXml)) riskFlags.embeddedMedia = true;
    if (/<presentation:transition\b/.test(contentXml) || /<anim:/.test(contentXml)) riskFlags.animations = true;
    if (/<table:table\b/.test(contentXml)) riskFlags.tables = true;
    if (/<draw:object\b/.test(contentXml)) riskFlags.charts = true;
  }

  // Check for macros
  if (zip.file('Basic/') || zip.file('Scripts/')) riskFlags.macros = true;

  return { properties, riskFlags, slideProfiles };
}
