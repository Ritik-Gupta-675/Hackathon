const fs = require('fs-extra');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { executeCode } = require('./executeCode');

// Returns an array of filenames that match common code file extensions.
async function getAllCodeFiles(directory) {
  const files = await fs.readdir(directory);
  return files.filter(file => file.match(/\.(js|ts|py|cpp|java|c|cs)$/));
}

async function generatePDF(folderPath) {
  // Create a new PDF document for the final output.
  const finalPdf = await PDFDocument.create();

  // Locate the front page PDF.
  const folderName = path.basename(folderPath);
  const frontPagePath = path.join(folderPath, `${folderName}.pdf`);

  if (!await fs.pathExists(frontPagePath)) {
    throw new Error(`Front page PDF (${folderName}.pdf) not found in ${folderPath}`);
  }

  // Load and copy pages from the front page PDF.
  const frontPageBytes = await fs.readFile(frontPagePath);
  const frontPdf = await PDFDocument.load(frontPageBytes);
  const frontPages = await finalPdf.copyPages(frontPdf, frontPdf.getPageIndices());
  frontPages.forEach(page => finalPdf.addPage(page));

  // Read and add all code files as new pages.
  const codeFiles = await getAllCodeFiles(folderPath);
  for (const file of codeFiles) {
    const filePath = path.join(folderPath, file);
    const content = await fs.readFile(filePath, 'utf-8');

    // Create a new page for each code file.
    const page = finalPdf.addPage([600, 800]);
    page.drawText(`File: ${file}\n\n${content}`, {
      x: 50,
      y: 750,
      size: 10,
      maxWidth: 500
    });
  }

  // Capture and add program output.
  const output = await executeCode(folderPath);
  const outputPage = finalPdf.addPage([600, 800]);
  outputPage.drawText(`Program Output:\n\n${output}`, {
    x: 50,
    y: 750,
    size: 10,
    maxWidth: 500
  });

  // Save the final merged PDF as submission.pdf.
  const pdfBytes = await finalPdf.save();
  await fs.writeFile(path.join(folderPath, "submission.pdf"), pdfBytes);
}

module.exports = {
  generatePDF
};
