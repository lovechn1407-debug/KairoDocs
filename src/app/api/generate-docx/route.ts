import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { htmlContent, documentName, templateName } = await req.json();

    if (!htmlContent) {
      return NextResponse.json({ error: 'No content provided.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const HTMLtoDOCX = require('html-to-docx');

    // Wrap content in a clean HTML document with professional styling
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 0; padding: 0; }
          h1 { font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 24pt; }
          h2 { font-size: 13pt; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; border-bottom: 1px solid #333; padding-bottom: 2pt; }
          h3 { font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 4pt; }
          p { margin: 6pt 0; text-align: justify; }
          ul, ol { margin: 6pt 0 6pt 24pt; }
          li { margin: 3pt 0; }
          table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
          th { background-color: #1e3a6e; color: white; font-weight: bold; padding: 6pt 8pt; border: 1px solid #333; }
          td { padding: 4pt 8pt; border: 1px solid #ccc; vertical-align: top; }
          strong { font-weight: bold; }
          em { font-style: italic; }
          div[style*="background:#fff7ed"] { background-color: #fff7ed; border-left: 4px solid #f97316; padding: 8pt; margin-bottom: 12pt; font-style: italic; color: #9a3412; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    const docxOptions = {
      orientation: 'portrait',
      pageSize: { width: 12240, height: 15840 }, // A4 in twips
      margins: {
        top: 1440,    // 1 inch
        right: 1080,  // 0.75 inch
        bottom: 1440,
        left: 1080,
      },
      title: documentName || templateName || 'Generated Document',
      creator: 'KairoDocs AI',
      description: `Generated using ${templateName || 'institutional template'} with Groq AI RAG`,
      font: 'Times New Roman',
      fontSize: 24,       // half-points (12pt)
      lineHeight: 276,    // 115% line height
      headerType: 'default',
      header: false,
      footerType: 'default',
      footer: false,
      table: { row: { cantSplit: true } },
      pageNumber: false,
    };

    const docxBuffer = await HTMLtoDOCX(fullHtml, null, docxOptions);

    const safeFileName = (documentName || templateName || 'document')
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 60);

    return new Response(docxBuffer, {
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
