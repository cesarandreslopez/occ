import { getExtension, EXTENSION_TO_TYPE } from '../utils.js';
import { parseDocx } from './docx.js';
import { parsePdf } from './pdf.js';
import { parseXlsx } from './xlsx.js';
import { parsePptx } from './pptx.js';
import { parseOdf } from './odf.js';

const PARSER_MAP = {
  docx: parseDocx,
  pdf: parsePdf,
  xlsx: parseXlsx,
  pptx: parsePptx,
  odt: parseOdf,
  ods: parseOdf,
  odp: parseOdf,
};

export async function parseFile(filePath, size) {
  const ext = getExtension(filePath);
  const parser = PARSER_MAP[ext];

  if (!parser) {
    return {
      filePath,
      size,
      success: false,
      fileType: EXTENSION_TO_TYPE[ext] || ext.toUpperCase(),
      metrics: null,
    };
  }

  try {
    const result = await parser(filePath);
    return {
      filePath,
      size,
      success: true,
      fileType: result.fileType,
      metrics: result.metrics,
    };
  } catch {
    return {
      filePath,
      size,
      success: false,
      fileType: EXTENSION_TO_TYPE[ext] || ext.toUpperCase(),
      metrics: null,
    };
  }
}

export async function parseFiles(files, concurrency = 10, onProgress) {
  const results = [];
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(f => parseFile(f.path, f.size))
    );
    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j];
      results.push(r.status === 'fulfilled' ? r.value : {
        filePath: batch[j]?.path,
        size: 0,
        success: false,
        fileType: 'Unreadable',
        metrics: null,
      });
      if (onProgress) onProgress(1, batch[j]?.path);
    }
  }
  return results;
}
