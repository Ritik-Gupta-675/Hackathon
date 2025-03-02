const fs = require('fs-extra');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { executeCode } = require('./executeCode');

// Returns an array of filenames that match common code file extensions.
async function getAllCodeFiles(directory) {
  const files = await fs.readdir(directory);
  return files.filter(file => file.match(/\.(js|ts|py|cpp|c\+\+|java|c|cs)$/i));
}

// Function to calculate text width
function calculateTextWidth(text, fontSize) {
  // Approximate width calculation (can be adjusted based on font)
  return text.length * fontSize * 0.6;
}

// Function to preserve indentation when wrapping lines
function preserveIndentation(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

// Function to split text into pages while preserving formatting
function splitTextIntoPages(text, maxLinesPerPage, pageWidth, fontSize, margin) {
  const lines = text.split('\n');
  const pages = [];
  let currentPage = [];
  let currentLineCount = 0;
  const effectiveWidth = pageWidth - (2 * margin);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indentationSpaces = preserveIndentation(line);
    const lineContent = line.slice(indentationSpaces);
    const indentation = ' '.repeat(indentationSpaces);
    
    // Calculate if the line needs wrapping
    const lineWidth = calculateTextWidth(line, fontSize);
    
    if (lineWidth <= effectiveWidth) {
      // Line fits as is
      if (currentLineCount >= maxLinesPerPage) {
        pages.push(currentPage.join('\n'));
        currentPage = [];
        currentLineCount = 0;
      }
      currentPage.push(line);
      currentLineCount++;
    } else {
      // Line needs wrapping
      let remainingText = lineContent;
      let firstLine = true;
      
      while (remainingText.length > 0) {
        const maxChars = Math.floor(effectiveWidth / (fontSize * 0.6));
        let wrapPoint = maxChars;
        
        // Find a good wrap point
        if (remainingText.length > maxChars) {
          wrapPoint = remainingText.lastIndexOf(' ', maxChars);
          if (wrapPoint === -1) wrapPoint = maxChars;
        }
        
        const wrappedLine = (firstLine ? indentation : indentation + '  ') + 
                           remainingText.slice(0, wrapPoint).trimRight();
        
        if (currentLineCount >= maxLinesPerPage) {
          pages.push(currentPage.join('\n'));
          currentPage = [];
          currentLineCount = 0;
        }
        
        currentPage.push(wrappedLine);
        currentLineCount++;
        
        remainingText = remainingText.slice(wrapPoint).trimLeft();
        firstLine = false;
      }
    }
  }
  
  if (currentPage.length > 0) {
    pages.push(currentPage.join('\n'));
  }
  
  return pages;
}

async function generatePDF(folderPath) {
  // Create a new PDF document for the final output.
  const finalPdf = await PDFDocument.create();

  // Load the Times Roman font
  const timesRomanFont = await finalPdf.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await finalPdf.embedFont(StandardFonts.TimesRomanBold);

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
  const headerFontSize = 14;  // Header font size set to 14px
  const contentFontSize = 12;  // Content font size updated to 12px
  const lineHeight = contentFontSize * 1.5;  // Line height adjusted for new font size
  const headerHeight = margin + headerFontSize * 2;
  const contentHeight = pageHeight - headerHeight - margin;
  const maxLinesPerPage = Math.floor(contentHeight / lineHeight);

  // Read and add all code files as new pages, along with their outputs.
  const codeFiles = await getAllCodeFiles(folderPath);
  for (const file of codeFiles) {
    const filePath = path.join(folderPath, file);
    const content = await fs.readFile(filePath, 'utf-8');

    // Split code into pages while preserving formatting
    const codePages = splitTextIntoPages(content, maxLinesPerPage, pageWidth, contentFontSize, margin);
    
    // Add each page of code
    for (let i = 0; i < codePages.length; i++) {
      const codePage = finalPdf.addPage([pageWidth, pageHeight]);
      const headerText = i === 0 ? `File: ${file} (Page ${i + 1}/${codePages.length})` : `${file} (continued, Page ${i + 1}/${codePages.length})`;

      // Draw header text with bold Times Roman font
      codePage.drawText(headerText, {
        x: margin,
        y: pageHeight - margin,
        size: headerFontSize,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0)
      });

      // Draw code content with regular Times Roman font
      const lines = codePages[i].split('\n');
      lines.forEach((line, lineIndex) => {
        codePage.drawText(line, {
          x: margin,
          y: pageHeight - headerHeight - lineHeight * (lineIndex + 1),
          size: contentFontSize,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
      });
    }

    // Execute the code and add its output
    const output = await executeCode(filePath);
    const outputPages = splitTextIntoPages(output, maxLinesPerPage, pageWidth, contentFontSize, margin);

    // Add each page of output
    for (let i = 0; i < outputPages.length; i++) {
      const outputPage = finalPdf.addPage([pageWidth, pageHeight]);
      const headerText = i === 0 ? `Output of ${file} (Page ${i + 1}/${outputPages.length})` : `Output of ${file} (continued, Page ${i + 1}/${outputPages.length})`;

      // Draw header text with bold Times Roman font
      outputPage.drawText(headerText, {
        x: margin,
        y: pageHeight - margin,
        size: headerFontSize,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0)
      });

      // Draw output content with regular Times Roman font
      const lines = outputPages[i].split('\n');
      lines.forEach((line, lineIndex) => {
        outputPage.drawText(line, {
          x: margin,
          y: pageHeight - headerHeight - lineHeight * (lineIndex + 1),
          size: contentFontSize,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
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
