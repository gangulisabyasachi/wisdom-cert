import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const timesBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
    const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

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
    drawCenteredTextScaled('W I S D O M   J O U R N A L', timesBold, 30, 20, 260, colTitleRed);
    drawCenteredTextScaled('(Worldwide Interdisciplinary Scholarship, Discoveries, and Original Manuscripts)', timesItalic, 15, 33, 260, colBlack);

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
    page.drawText(dateStr, { x: cX(30), y: cY(45) - 15 * 0.8, size: 15, font: timesBold, color: colBlack });

    // Presents
    drawCenteredTextScaled('p r e s e n t s', timesItalic, 19, 58, 200, colBlack);
    drawCenteredTextScaled('CERTIFICATE OF PUBLICATION', timesBold, 24, 70, 260, colTitleRed);

    // Awarded To
    drawCenteredTextScaled('This certificate is awarded to Dr./Prof./Mr./Ms.', timesRoman, 14, 90, 260);
    drawCenteredTextScaled(certificate.recipient_name, timesItalic, 20, 102, 260, colBorderRed); // Using border red [128, 0, 0] as in PHP
    drawCenteredTextScaled(`${certificate.designation}, ${certificate.institution}`, timesRoman, 14, 110, 260);

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
    const segment1 = { text: `For her/his exceptional contribution to ${contribution_to} `, font: timesRoman };
    const segment2 = { text: `"${certificate.book_title} (${identifier_label}: ${identifier_value})"`, font: timesBold };
    const segment3 = { text: ` having her/his ${paper} titled `, font: timesRoman };
    const segment4 = { text: `"${certificate.chapter_title}".`, font: timesBoldItalic };

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
          // Add back spaces except for the very last word of a segment if needed?
          // Actually, just add a space string after every word except the last one in the whole list.
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
      { text: `For her/his exceptional contribution to ${contribution_to} `, font: timesRoman },
      { text: `"${certificate.book_title} (${identifier_label}: ${identifier_value})"`, font: timesBold },
      { text: ` having her/his ${paper} titled `, font: timesRoman },
      { text: `"${certificate.chapter_title}".`, font: timesBoldItalic }
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
      page.drawImage(sig1, { x: cX(40), y: cY(sigY - 12) - sig1H, width: sig1W, height: sig1H });
    } catch (e) { }

    page.drawLine({ start: { x: cX(40), y: cY(sigY) }, end: { x: cX(90), y: cY(sigY) }, thickness: 0.5 });
    page.drawText('For Jayasree Publications', { x: cX(40) + (cX(50) - timesRoman.widthOfTextAtSize('For Jayasree Publications', 10)) / 2, y: cY(sigY + 5), size: 10, font: timesRoman });

    try {
      const seal = await pdfDoc.embedPng(fs.readFileSync(path.join(publicDir, 'publisher_seal.png')));
      const sealW = cX(30);
      const sealH = (sealW * seal.height) / seal.width;
      page.drawImage(seal, { x: cX(130), y: cY(sigY - 12) - sealH, width: sealW, height: sealH });
    } catch (e) { }

    try {
      const sig2 = await pdfDoc.embedPng(fs.readFileSync(path.join(publicDir, 'signature2.png')));
      const sig2W = cX(18);
      const sig2H = (sig2W * sig2.height) / sig2.width;
      // sigY-15 to move it high above the line as requested
      page.drawImage(sig2, { x: cX(211), y: cY(sigY - 15) - sig2H, width: sig2W, height: sig2H });
    } catch (e) { }

    page.drawLine({ start: { x: cX(195), y: cY(sigY) }, end: { x: cX(245), y: cY(sigY) }, thickness: 0.5 });
    page.drawText('Prithwish Ganguli', { x: cX(195) + (cX(50) - timesRoman.widthOfTextAtSize('Prithwish Ganguli', 12)) / 2, y: cY(sigY + 5), size: 12, font: timesRoman });
    page.drawText('Editor', { x: cX(195) + (cX(50) - timesRoman.widthOfTextAtSize('Editor', 10)) / 2, y: cY(sigY + 10), size: 10, font: timesRoman });

    // Footer
    drawCenteredTextScaled('175, Canning Road, S 6, Kolkata 700 144', timesRoman, 10, 185, 260, colGray);
    drawCenteredTextScaled('www.wisdomj.in, editorial@wisdomj.in', timesRoman, 10, 190, 260, colGray);
    drawCenteredTextScaled('To verify the certificate, please visit https://certificates.wisdomj.in/verify and enter your certificate number', timesRoman, 9, 195, 260, colGray);

    // QR & Code
    page.drawText('For Certificate No.', { x: cX(18), y: cY(168), size: 9, font: timesRoman });
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
