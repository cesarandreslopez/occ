import { Packer, Document, Paragraph, TextRun } from 'docx';
import XLSX from 'xlsx';
import { writeFile, mkdir } from 'node:fs/promises';

await mkdir('test/fixtures', { recursive: true });

// Create a small DOCX
async function createDocx() {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun('Hello world. This is a test document.')] }),
        new Paragraph({ children: [new TextRun('It has multiple paragraphs of text content.')] }),
        new Paragraph({ children: [new TextRun('The quick brown fox jumps over the lazy dog.')] }),
      ],
    }],
  });
  const buffer = await Packer.toBuffer(doc);
  await writeFile('test/fixtures/sample.docx', buffer);
  console.log('Created sample.docx');
}

// Create a small XLSX
async function createXlsx() {
  const workbook = XLSX.utils.book_new();
  const sheet1 = XLSX.utils.aoa_to_sheet([
    ['Name', 'Age', 'City'],
    ['Alice', 30, 'NYC'],
    ['Bob', 25, 'London'],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet1, 'Sheet1');

  const sheet2 = XLSX.utils.aoa_to_sheet([
    ['Product', 'Price'],
    ['Widget', 9.99],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet2, 'Sheet2');

  XLSX.writeFile(workbook, 'test/fixtures/sample.xlsx');
  console.log('Created sample.xlsx');
}

await createDocx();
await createXlsx();
console.log('Fixtures created.');
