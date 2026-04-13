const { PDFDocument, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');

async function test() {
  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    
    const fontsDir = path.join(__dirname, 'lib', 'fonts');
    const fonts = [
        'Baskervville-Regular.ttf',
        'Baskervville-Italic.ttf',
        'Baskervville-Medium.ttf',
        'Baskervville-Bold.ttf',
        'Baskervville-BoldItalic.ttf',
        'PinyonScript-Regular.ttf',
        'Jacquard24-Regular.ttf',
        'Rye-Regular.ttf'
    ];

    for (const fontName of fonts) {
      const fontPath = path.join(fontsDir, fontName);
      if (fs.existsSync(fontPath)) {
        console.log(`Checking ${fontName}...`);
        const bytes = fs.readFileSync(fontPath);
        await pdfDoc.embedFont(bytes);
        console.log(`Successfully embedded ${fontName}`);
      } else {
        console.error(`Font NOT FOUND: ${fontName}`);
      }
    }
  } catch (e) {
    console.error('CRITICAL ERROR DURING FONT TEST:', e);
  }
}

test();
