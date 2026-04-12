import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import connectDB from '@/lib/db';
import Certificate from '@/lib/models/Certificate';

const mm = 2.83465;
const A4_W = 297 * mm;
const A4_H = 210 * mm;

function cX(x) { return x * mm; }
function cY(y) { return A4_H - (y * mm); } // Top-down coordinate (y mm from top)

export async function GET(request, { params }) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const { code } = resolvedParams;

    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

    const certificate = await Certificate.findOne({ certificate_code: code });
    if (!certificate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Identify - explicitly check for non-empty isbn to avoid treating empty string as book
    const is_book = !!certificate.isbn && certificate.isbn.trim() !== '';
    const identifier_label = is_book ? 'ISBN' : 'ISSN(P)';
    const identifier_value = is_book ? certificate.isbn : certificate.issn;
    const contribution_to = is_book ? 'the edited book' : 'the WISDOM Journal';
    const paper = is_book ? 'chapter' : 'paper';

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([A4_W, A4_H]);

    // Fonts
    try {
      pdfDoc.registerFontkit(fontkit);
    } catch (e) {
      console.error('Fontkit registration failed:', e);
    }

    let greatVibes, jacquard24, ryeFont;
    let pfReg, pfBold, pfItalic, pfBoldItalic;
    
    try {
      const fontsDir = path.join(process.cwd(), 'lib', 'fonts');
      
      const gvPath = path.join(fontsDir, 'GreatVibes-Regular.ttf');
      if (fs.existsSync(gvPath)) greatVibes = await pdfDoc.embedFont(fs.readFileSync(gvPath));

      const jqPath = path.join(fontsDir, 'Jacquard24-Regular.ttf');
      if (fs.existsSync(jqPath)) jacquard24 = await pdfDoc.embedFont(fs.readFileSync(jqPath));

      const ryePath = path.join(fontsDir, 'Rye-Regular.ttf');
      if (fs.existsSync(ryePath)) ryeFont = await pdfDoc.embedFont(fs.readFileSync(ryePath));

      // Load Playfair Display family
      const pfRegPath = path.join(fontsDir, 'PlayfairDisplay-Regular.ttf');
      if (fs.existsSync(pfRegPath)) pfReg = await pdfDoc.embedFont(fs.readFileSync(pfRegPath));

      const pfBoldPath = path.join(fontsDir, 'PlayfairDisplay-Bold.ttf');
      if (fs.existsSync(pfBoldPath)) pfBold = await pdfDoc.embedFont(fs.readFileSync(pfBoldPath));

      const pfItalicPath = path.join(fontsDir, 'PlayfairDisplay-Italic.ttf');
      if (fs.existsSync(pfItalicPath)) pfItalic = await pdfDoc.embedFont(fs.readFileSync(pfItalicPath));

      const pfBIPath = path.join(fontsDir, 'PlayfairDisplay-BoldItalic.ttf');
      if (fs.existsSync(pfBIPath)) pfBoldItalic = await pdfDoc.embedFont(fs.readFileSync(pfBIPath));

    } catch (e) {
      console.error('Failed to embed custom fonts:', e);
    }

    // Embed Standard Fonts as fallbacks
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const timesBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
    const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

    const fReg = pfReg || timesRoman;
    const fBold = pfBold || timesBold;
    const fItalic = pfItalic || timesItalic;
    const fBoldItalic = pfBoldItalic || timesBoldItalic;

    const recipientFont = greatVibes || fItalic;
    const titleFont = jacquard24 || fBold;

    // Colors
    const colBlack = rgb(0, 0, 0);
    const colBorderRed = rgb(128 / 255, 0, 0); // [128, 0, 0]
    const colTitleRed = rgb(160 / 255, 0, 0);  // [160, 0, 0]
    const colGray = rgb(80 / 255, 80 / 255, 80 / 255);

    // Border Rect
    page.drawRectangle({
      x: cX(10),
      y: cY(200), // bottom is at 10mm from bottom (210 - 200 = 10)
      width: cX(277),
      height: cX(190),
      borderColor: colBorderRed,
      borderWidth: 1.5,
    });

    // Helper to draw centered text with auto-scaling
    const drawCenteredTextScaled = (text, font, baseSize, y_mm, maxWidth_mm, color = colBlack) => {
      let size = baseSize;
      let textWidth = font.widthOfTextAtSize(text, size);
      const maxWidth = cX(maxWidth_mm);

      if (textWidth > maxWidth) {
        size = baseSize * (maxWidth / textWidth);
        textWidth = font.widthOfTextAtSize(text, size);
      }

      page.drawText(text, {
        x: (A4_W - textWidth) / 2,
        y: cY(y_mm) - size * 0.8,
        size,
        font,
        color
      });
    };

    // Header
    drawCenteredTextScaled('W I S D O M   J O U R N A L', ryeFont || fBold, 32, 20, 260, colTitleRed);
    drawCenteredTextScaled('(Worldwide Interdisciplinary Scholarship, Discoveries, and Original Manuscripts)', fItalic, 15, 33, 260, colBlack);

    const publicDir = path.join(process.cwd(), 'public');

    // Logo (JPEG as requested earlier)
    try {
      const logoPath = path.join(publicDir, 'logo.jpeg');
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImg = await pdfDoc.embedJpg(logoBytes);
        const logoW = cX(20);
        const logoH = (logoW * logoImg.height) / logoImg.width;
        page.drawImage(logoImg, { x: cX(255), y: cY(15) - logoH, width: logoW, height: logoH });
      }
    } catch (e) { }

    // Date
    const issueDate = new Date(certificate.issue_date);
    const dateStr = `Date: ${issueDate.getDate().toString().padStart(2, '0')}/${(issueDate.getMonth() + 1).toString().padStart(2, '0')}/${issueDate.getFullYear()}`;
    page.drawText(dateStr, { x: cX(30), y: cY(45) - 15 * 0.8, size: 15, font: fBold, color: colBlack });

    // Presents
    drawCenteredTextScaled('p r e s e n t s', fItalic, 19, 58, 200, colBlack);
    drawCenteredTextScaled('Certificate of Publication', titleFont, 42, 73, 260, colTitleRed);

    // Awarded To
    drawCenteredTextScaled('This certificate is awarded to Dr./Prof./Mr./Ms.', fReg, 14, 90, 260);
    drawCenteredTextScaled(certificate.recipient_name, recipientFont, 32, 101, 260, colBorderRed); 
    drawCenteredTextScaled(`${certificate.designation}, ${certificate.institution}`, fReg, 14, 113, 260);

    // Line separator
    page.drawLine({
      start: { x: cX(25), y: cY(122) },
      end: { x: A4_W - cX(17), y: cY(122) },
      thickness: 1.5,
      color: colBlack
    });

    // Body text logic with mixed styles (Bold/Italic) and wrapping
    const maxWidth = cX(240);

    // We break into segments to allow different font styles per part
    const segment1 = { text: `For her/his exceptional contribution to ${contribution_to} `, font: fReg };
    const segment2 = { text: `"${certificate.book_title} (${identifier_label}: ${identifier_value})"`, font: fBold };
    const segment3 = { text: ` having her/his ${paper} titled `, font: fReg };
    const segment4 = { text: `"${certificate.chapter_title}".`, font: fBoldItalic };

    // New: Dynamic Mixed-Style Paragraph Wrapper
    const drawMixedCenteredParagraph = (segments, startY_mm, maxWidth_mm, fontSize, lineSpacing_mm = 7) => {
      const maxWidth = cX(maxWidth_mm);
      const lines = [];
      let currentLine = [];
      let currentLineWidth = 0;

      // Flatten segments into "styled words"
      const styledWords = [];
      segments.forEach(segment => {
        const words = segment.text.split(' ');
        words.forEach((word, index) => {
          styledWords.push({
            text: word + (index === words.length - 1 ? '' : ' '),
            font: segment.font
          });
        });
      });

      // Wrap into lines
      styledWords.forEach(sw => {
        const wordWidth = sw.font.widthOfTextAtSize(sw.text, fontSize);
        if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [sw];
          currentLineWidth = wordWidth;
        } else {
          currentLine.push(sw);
          currentLineWidth += wordWidth;
        }
      });
      if (currentLine.length > 0) lines.push(currentLine);

      // Draw each line centered
      let currentY = startY_mm;
      lines.forEach(line => {
        let lineW = 0;
        line.forEach(sw => lineW += sw.font.widthOfTextAtSize(sw.text, fontSize));

        let startX = (A4_W - lineW) / 2;
        line.forEach(sw => {
          page.drawText(sw.text, {
            x: startX,
            y: cY(currentY) - fontSize * 0.8,
            size: fontSize,
            font: sw.font,
            color: colBlack
          });
          startX += sw.font.widthOfTextAtSize(sw.text, fontSize);
        });
        currentY += lineSpacing_mm;
      });
    };

    // Define segments for the paragraph
    const bodySegments = [
      { text: `For her/his exceptional contribution to ${contribution_to} `, font: fReg },
      { text: `"${certificate.book_title} (${identifier_label}: ${identifier_value})"`, font: fBold },
      { text: ` having her/his ${paper} titled `, font: fReg },
      { text: `"${certificate.chapter_title}".`, font: fBoldItalic }
    ];

    // Draw as a natural paragraph starting at 128mm from top
    drawMixedCenteredParagraph(bodySegments, 128, 240, 12);

    // Signatures
    const sigY = 165;
    try {
      const sig1 = await pdfDoc.embedPng(fs.readFileSync(path.join(publicDir, 'signature1.png')));
      const sig1W = cX(40);
      const sig1H = (sig1W * sig1.height) / sig1.width;
      // sigY-12 to move it high above the line as requested
      page.drawImage(sig1, { x: cX(45), y: cY(sigY - 12) - sig1H, width: sig1W, height: sig1H });
    } catch (e) { }

    page.drawLine({ start: { x: cX(45), y: cY(sigY) }, end: { x: cX(95), y: cY(sigY) }, thickness: 0.5 });
    page.drawText('For Jayasree Publications', { x: cX(45) + (cX(50) - fReg.widthOfTextAtSize('For Jayasree Publications', 10)) / 2, y: cY(sigY + 5), size: 10, font: fReg });

    try {
      const seal = await pdfDoc.embedPng(fs.readFileSync(path.join(publicDir, 'publisher_seal.png')));
      const sealW = cX(30);
      const sealH = (sealW * seal.height) / seal.width;
      // Centering seal: Page is 297mm wide. Seal center at 148.5. Seal width is 30. Start X = 148.5 - 15 = 133.5
      page.drawImage(seal, { x: cX(133.5), y: cY(sigY - 12) - sealH, width: sealW, height: sealH });
    } catch (e) { }

    try {
      const sig2 = await pdfDoc.embedPng(fs.readFileSync(path.join(publicDir, 'signature2.png')));
      const sig2W = cX(18);
      const sig2H = (sig2W * sig2.height) / sig2.width;
      // sigY-15 to move it high above the line as requested
      page.drawImage(sig2, { x: cX(218), y: cY(sigY - 15) - sig2H, width: sig2W, height: sig2H });
    } catch (e) { }

    page.drawLine({ start: { x: cX(202), y: cY(sigY) }, end: { x: cX(252), y: cY(sigY) }, thickness: 0.5 });
    page.drawText('Prithwish Ganguli', { x: cX(202) + (cX(50) - fReg.widthOfTextAtSize('Prithwish Ganguli', 12)) / 2, y: cY(sigY + 5), size: 12, font: fReg });
    page.drawText('Editor', { x: cX(202) + (cX(50) - fReg.widthOfTextAtSize('Editor', 10)) / 2, y: cY(sigY + 10), size: 10, font: fReg });

    // Footer
    drawCenteredTextScaled('175, Canning Road, S 6, Kolkata 700 144', fReg, 10, 185, 260, colGray);
    drawCenteredTextScaled('www.wisdomj.in, editorial@wisdomj.in', fReg, 10, 190, 260, colGray);
    drawCenteredTextScaled('To verify the certificate, please visit https://certificates.wisdomj.in/verify and enter your certificate number', fReg, 9, 195, 260, colGray);

    // QR & Code
    page.drawText('For Certificate No.', { x: cX(18), y: cY(168), size: 9, font: fReg });
    page.drawText(certificate.certificate_code, { x: cX(18), y: cY(172), size: 9, font: courierBold });

    const verifyUrl = `https://certificates.wisdomj.in/verify?code=${certificate.certificate_code}`;
    const qrBuffer = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 100 });
    const qrImg = await pdfDoc.embedPng(qrBuffer);
    page.drawImage(qrImg, { x: cX(19), y: cY(198), width: cX(20), height: cX(20) });

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${certificate.certificate_code}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
