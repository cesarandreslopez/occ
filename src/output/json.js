export function formatJson(stats, sccData = null) {
  const mapRow = (r) => {
    const entry = {
      type: r.fileType,
      ...(r.fileName ? { name: r.fileName } : {}),
      ...(r.filePath ? { path: r.filePath } : {}),
      count: r.files,
    };
    if (r.hasWords) entry.words = r.words || 0;
    if (r.hasPages) entry.pages = r.pages || 0;
    if (r.hasParagraphs) entry.paragraphs = r.paragraphs || 0;
    if (r.hasSheets) entry.sheets = r.sheets || 0;
    if (r.hasRows) entry.rows = r.rows || 0;
    if (r.hasCells) entry.cells = r.cells || 0;
    if (r.hasSlides) entry.slides = r.slides || 0;
    entry.size = r.size;
    return entry;
  };

  const { columns } = stats;
  const mapTotals = (t) => {
    const entry = { files: t.files };
    if (columns.hasWords) entry.words = t.words;
    if (columns.hasPages) entry.pages = t.pages;
    if (columns.hasParagraphs) entry.paragraphs = t.paragraphs;
    if (columns.hasSheets) entry.sheets = t.sheets;
    if (columns.hasRows) entry.rows = t.rows;
    if (columns.hasCells) entry.cells = t.cells;
    if (columns.hasSlides) entry.slides = t.slides;
    entry.size = t.size;
    return entry;
  };

  const output = {
    documents: {
      files: stats.rows.map(mapRow),
      totals: mapTotals(stats.totals),
    },
  };

  if (sccData && sccData.length > 0) {
    output.code = sccData;
  }

  return JSON.stringify(output, null, 2);
}
