import { NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, PageOrientation, convertInchesToTwip,
} from 'docx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─── Tiny HTML-to-docx node parser ───────────────────────────────────────────
// Extracts structured content from the Jodit/Groq HTML output without needing
// any browser DOM APIs or fragile third-party libraries.

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function htmlToDocxChildren(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Split on block-level tags to get logical sections
  const blocks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p[^>]*>[\s\S]*?<\/p>|<li[^>]*>[\s\S]*?<\/li>|<tr[^>]*>[\s\S]*?<\/tr>)/gi)
    .filter(b => b.trim());

  for (const block of blocks) {
    const tag = (block.match(/^<(\w+)/)?.[1] || '').toLowerCase();
    const inner = stripTags(block);
    if (!inner.trim()) continue;

    if (tag === 'h1') {
      paragraphs.push(new Paragraph({
        text: inner,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }));
    } else if (tag === 'h2') {
      paragraphs.push(new Paragraph({
        text: inner,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1e3a6e' } },
      }));
    } else if (tag === 'h3') {
      paragraphs.push(new Paragraph({
        text: inner,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 80 },
      }));
    } else if (tag === 'li') {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: inner, font: 'Times New Roman', size: 24 })],
        bullet: { level: 0 },
        spacing: { after: 60 },
      }));
    } else {
      // Detect bold spans / strong tags for inline formatting
      const runs: TextRun[] = [];
      const parts = block.split(/(<strong[^>]*>.*?<\/strong>|<b[^>]*>.*?<\/b>)/gi);
      for (const part of parts) {
        const isBold = /^<(strong|b)/i.test(part);
        const text = stripTags(part);
        if (text) runs.push(new TextRun({ text, bold: isBold, font: 'Times New Roman', size: 24 }));
      }
      if (runs.length) {
        paragraphs.push(new Paragraph({
          children: runs,
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100 },
        }));
      }
    }
  }

  return paragraphs;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { htmlContent, documentName, templateName } = await req.json();

    if (!htmlContent) {
      return NextResponse.json({ error: 'No content provided.' }, { status: 400 });
    }

    const title = documentName || templateName || 'Generated Document';
    const children = htmlToDocxChildren(htmlContent);

    // Ensure at least a title paragraph if parsing produced nothing
    if (children.length === 0) {
      children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
    }

    const doc = new Document({
      creator: 'KairoDocs AI',
      title,
      description: `Generated using ${templateName || 'institutional template'} with Groq AI RAG`,
      styles: {
        default: {
          document: {
            run: { font: 'Times New Roman', size: 24 }, // 12pt
          },
          heading1: {
            run: { font: 'Times New Roman', size: 32, bold: true, color: '1e3a6e' },
            paragraph: { spacing: { after: 240 }, alignment: AlignmentType.CENTER },
          },
          heading2: {
            run: { font: 'Times New Roman', size: 28, bold: true, color: '1e3a6e' },
            paragraph: { spacing: { before: 240, after: 120 } },
          },
          heading3: {
            run: { font: 'Times New Roman', size: 26, bold: true, color: '2d5986' },
            paragraph: { spacing: { before: 180, after: 80 } },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) }, // A4
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(0.75),
            },
          },
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    const safeFileName = title
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 60) || 'document';

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeFileName}.docx"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('[GenerateDocx] Error:', error.message);
    return NextResponse.json({ error: 'Failed to generate DOCX: ' + error.message }, { status: 500 });
  }
}
