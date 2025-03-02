const fs = require('fs-extra');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const { executeCode } = require('./executeCode');

// Returns an array of filenames that match common code file extensions.
async function getAllCodeFiles(directory) {
  const files = await fs.readdir(directory);
  return files.filter(file => file.match(/\.(js|ts|py|cpp|java|c|cs)$/));
}

// Function to split text into pages
function splitTextIntoPages(text, maxLinesPerPage) {
  const lines = text.split('\n');
  const pages = [];
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage).join('\n'));
  }
  return pages;
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

  // Constants for page layout
  const pageHeight = 800;
  const pageWidth = 600;
  const margin = 50;
  const fontSize = 10;
  const lineHeight = fontSize * 1.2; // 1.2 is the line spacing factor
  const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

  // Read and add all code files as new pages, along with their outputs.
  const codeFiles = await getAllCodeFiles(folderPath);
  for (const file of codeFiles) {
    const filePath = path.join(folderPath, file);
    const content = await fs.readFile(filePath, 'utf-8');

    // Split code into pages
    const codePages = splitTextIntoPages(content, maxLinesPerPage);
    
    // Add each page of code
    for (let i = 0; i < codePages.length; i++) {
      const codePage = finalPdf.addPage([pageWidth, pageHeight]);
      const headerText = i === 0 ? `File: ${file} (Page ${i + 1}/${codePages.length})` : `${file} (continued, Page ${i + 1}/${codePages.length})`;
      
      // Draw header
      codePage.drawText(headerText, {
        x: margin,
        y: pageHeight - margin,
        size: fontSize,
        color: rgb(0, 0, 0)
      });

      // Draw code content
      codePage.drawText(codePages[i], {
        x: margin,
        y: pageHeight - margin - lineHeight * 2, // Start below header
        size: fontSize,
        lineHeight: lineHeight,
        maxWidth: pageWidth - 2 * margin
      });
    }

    // Execute the code and add its output
    const output = await executeCode(filePath);
    const outputPages = splitTextIntoPages(output, maxLinesPerPage);

    // Add each page of output
    for (let i = 0; i < outputPages.length; i++) {
      const outputPage = finalPdf.addPage([pageWidth, pageHeight]);
      const headerText = i === 0 ? `Output of ${file} (Page ${i + 1}/${outputPages.length})` : `Output of ${file} (continued, Page ${i + 1}/${outputPages.length})`;
      
      // Draw header
      outputPage.drawText(headerText, {
        x: margin,
        y: pageHeight - margin,
        size: fontSize,
        color: rgb(0, 0, 0)
      });

      // Draw output content
      outputPage.drawText(outputPages[i], {
        x: margin,
        y: pageHeight - margin - lineHeight * 2, // Start below header
        size: fontSize,
        lineHeight: lineHeight,
        maxWidth: pageWidth - 2 * margin
      });
    }
  }

  // Save the final merged PDF as submission.pdf.
  const pdfBytes = await finalPdf.save();
  await fs.writeFile(path.join(folderPath, "submission.pdf"), pdfBytes);
}

module.exports = {
  generatePDF
};
