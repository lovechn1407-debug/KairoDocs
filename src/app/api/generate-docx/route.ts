import { NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, convertInchesToTwip,
} from 'docx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─── HTML entity / tag helpers ────────────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .trim();
}

function makeTextRuns(html: string): TextRun[] {
  const runs: TextRun[] = [];
  // Split on bold (<strong>/<b>) and italic (<em>/<i>) spans
  const parts = html.split(/(<(?:strong|b|em|i)[^>]*>[\s\S]*?<\/(?:strong|b|em|i)>)/gi);
  for (const part of parts) {
    const bold = /^<(strong|b)/i.test(part);
    const italic = /^<(em|i)/i.test(part);
    const text = stripTags(part);
    if (text) runs.push(new TextRun({ text, bold, italics: italic, font: 'Garamond', size: 24 }));
  }
  return runs.length ? runs : [new TextRun({ text: '', font: 'Garamond', size: 24 })];
}

// ─── Table parser ─────────────────────────────────────────────────────────────

function parseTable(tableHtml: string): Table {
  const rowMatches = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  const rows = rowMatches.map((rowHtml, rowIndex) => {
    const cellMatches = rowHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    const isHeader = /<th/i.test(rowHtml) || rowIndex === 0;

    const cells = cellMatches.map(cellHtml => {
      const cellText = stripTags(cellHtml);
      return new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({
              text: cellText,
              bold: isHeader,
              font: 'Garamond',
              size: isHeader ? 22 : 22,
              color: isHeader ? 'FFFFFF' : '000000',
            })],
            spacing: { before: 60, after: 60 },
          }),
        ],
        shading: isHeader
          ? { type: ShadingType.SOLID, color: '1e3a6e', fill: '1e3a6e' }
          : { type: ShadingType.CLEAR, color: 'auto', fill: rowIndex % 2 === 0 ? 'FFFFFF' : 'EEF2FF' },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
        },
      });
    });

    if (cells.length === 0) return null;
    return new TableRow({ children: cells, tableHeader: isHeader });
  }).filter(Boolean) as TableRow[];

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 120, bottom: 120 },
  });
}

// ─── Main HTML → DOCX block parser ───────────────────────────────────────────
// Returns mixed array of Paragraph | Table so tables appear inline with text.

function htmlToDocxChildren(html: string): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  // First, extract full <table> blocks so they're not broken apart by the general splitter
  const segments: Array<{ type: 'table' | 'html'; content: string }> = [];
  let remaining = html;
  const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  tableRegex.lastIndex = 0;
  while ((match = tableRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'table', content: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < html.length) {
    segments.push({ type: 'html', content: html.slice(lastIndex) });
  }

  for (const segment of segments) {
    if (segment.type === 'table') {
      // Add spacing paragraph before table
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      children.push(parseTable(segment.content));
      // Add spacing paragraph after table
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      continue;
    }

    // Parse non-table HTML blocks
    const blocks = segment.content
      .replace(/<br\s*\/?>/gi, '\n')
      .split(/(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p[^>]*>[\s\S]*?<\/p>|<li[^>]*>[\s\S]*?<\/li>)/gi)
      .filter(b => b.trim());

    for (const block of blocks) {
      const tag = (block.match(/^<(\w+)/)?.[1] || '').toLowerCase();
      const inner = stripTags(block);
      if (!inner.trim()) continue;

      if (tag === 'h1') {
        children.push(new Paragraph({
          text: inner,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
        }));
      } else if (tag === 'h2') {
        children.push(new Paragraph({
          text: inner,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1e3a6e' } },
        }));
      } else if (tag === 'h3') {
        children.push(new Paragraph({
          text: inner,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        }));
      } else if (tag === 'li') {
        children.push(new Paragraph({
          children: [new TextRun({ text: inner, font: 'Garamond', size: 24 })],
          bullet: { level: 0 },
          spacing: { after: 60 },
        }));
      } else {
        const runs = makeTextRuns(block);
        children.push(new Paragraph({
          children: runs,
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100 },
        }));
      }
    }
  }

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    let { htmlContent, documentName, templateName } = await req.json();

    if (!htmlContent) {
      return NextResponse.json({ error: 'No content provided.' }, { status: 400 });
    }

    // Strip the AI RAG Validation Notes so it never appears in the downloaded DOCX file
    htmlContent = htmlContent.replace(/<div(?:[^>]*)?>\s*<strong>⚠️ AI RAG Validation Notes:<\/strong>[\s\S]*?<\/div>/gi, '');

    const title = documentName || templateName || 'Generated Document';
    const children = htmlToDocxChildren(htmlContent);

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
            run: { font: 'Garamond', size: 24 },
          },
          heading1: {
            run: { font: 'Garamond', size: 32, bold: true, color: '1e3a6e' },
            paragraph: { spacing: { after: 240 }, alignment: AlignmentType.CENTER },
          },
          heading2: {
            run: { font: 'Garamond', size: 28, bold: true, color: '1e3a6e' },
            paragraph: { spacing: { before: 240, after: 120 } },
          },
          heading3: {
            run: { font: 'Garamond', size: 26, bold: true, color: '2d5986' },
            paragraph: { spacing: { before: 180, after: 80 } },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
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
