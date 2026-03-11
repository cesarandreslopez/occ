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

function extractAllText(xml: string): string {
  const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
  return matches.map(m => {
    const text = m.match(/<a:t>([^<]*)<\/a:t>/);
    return text?.[1] || '';
  }).join(' ').trim();
}

export async function extractPptxProperties(zip: JSZip): Promise<DocumentProperties> {
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

export async function extractPptxRiskFlags(zip: JSZip, slideProfiles: SlideProfile[]): Promise<SlideRiskFlags> {
  const flags: SlideRiskFlags = {
    comments: false,
    speakerNotes: false,
    hyperlinks: false,
    embeddedMedia: false,
    animations: false,
    macros: false,
    charts: false,
    tables: false,
  };

  // Check for comments folder
  const commentFiles = Object.keys(zip.files).filter(name => /^ppt\/comments\//.test(name));
  if (commentFiles.length > 0) flags.comments = true;

  // Check for speaker notes
  if (slideProfiles.some(p => p.hasNotes)) flags.speakerNotes = true;

  // Check for media files
  const mediaFiles = Object.keys(zip.files).filter(name => /^ppt\/media\//.test(name));
  if (mediaFiles.length > 0) flags.embeddedMedia = true;

  // Check for macros
  if (zip.file('ppt/vbaProject.bin')) flags.macros = true;

  // Check for charts
  const chartFiles = Object.keys(zip.files).filter(name => /^ppt\/charts\//.test(name));
  if (chartFiles.length > 0) flags.charts = true;

  // Aggregate from profiles
  if (slideProfiles.some(p => p.tables > 0)) flags.tables = true;

  // Check slides for animations and hyperlinks
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

  for (const slideFile of slideFiles) {
    const xml = await zip.file(slideFile)?.async('text');
    if (!xml) continue;
    if (/<p:transition\b/.test(xml) || /<p:anim\b/.test(xml) || /<p:animMotion\b/.test(xml)) {
      flags.animations = true;
    }
    if (/<a:hlinkClick\b/.test(xml) || /<a:hlinkMouseOver\b/.test(xml)) {
      flags.hyperlinks = true;
    }
    if (flags.animations && flags.hyperlinks) break;
  }

  return flags;
}

export async function extractPptxSlideProfiles(zip: JSZip): Promise<SlideProfile[]> {
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

  const profiles: SlideProfile[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const slideXml = await zip.file(slideFiles[i])?.async('text');
    if (!slideXml) continue;

    // Extract title
    let title: string | null = null;
    // Look for title placeholder
    const titleMatch = slideXml.match(/<p:sp>[\s\S]*?<p:ph[^>]*type="(?:title|ctrTitle)"[^>]*\/>[\s\S]*?<\/p:sp>/i);
    if (titleMatch) {
      const titleText = extractAllText(titleMatch[0]);
      if (titleText) title = titleText;
    }

    // Extract all text for word count
    const allText = extractAllText(slideXml);
    const words = countWords(allText);

    // Count tables
    const tables = (slideXml.match(/<a:tbl\b/g) || []).length;

    // Count images
    const images = (slideXml.match(/<p:pic\b/g) || []).length + (slideXml.match(/<a:blip\b/g) || []).length;

    // Count charts (from relationships)
    const slideNum = parseInt(slideFiles[i].match(/slide(\d+)/)?.[1] || '0', 10);
    const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const relsXml = await zip.file(relsFile)?.async('text');
    const charts = relsXml ? (relsXml.match(/chart/gi) || []).length : 0;

    // Check for speaker notes
    const notesFile = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    const notesXml = await zip.file(notesFile)?.async('text');
    let hasNotes = false;
    let notePreview: string | null = null;
    if (notesXml) {
      const notesText = extractAllText(notesXml);
      // Filter out slide number placeholder text
      const cleanNotes = notesText.replace(/\d+/g, '').trim();
      if (cleanNotes.length > 0) {
        hasNotes = true;
        notePreview = notesText.length > 200 ? notesText.slice(0, 200) + '...' : notesText;
      }
    }

    profiles.push({
      index: i + 1,
      title,
      words,
      hasNotes,
      notePreview,
      images,
      tables,
      charts,
    });
  }

  return profiles;
}

export async function inspectPptx(
  buffer: Buffer,
): Promise<{
  properties: DocumentProperties;
  riskFlags: SlideRiskFlags;
  slideProfiles: SlideProfile[];
}> {
  const zip = await JSZip.loadAsync(buffer);
  const properties = await extractPptxProperties(zip);
  const slideProfiles = await extractPptxSlideProfiles(zip);
  const riskFlags = await extractPptxRiskFlags(zip, slideProfiles);

  return { properties, riskFlags, slideProfiles };
}
