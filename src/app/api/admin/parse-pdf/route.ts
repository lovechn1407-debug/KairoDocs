import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // ── Polyfill DOM APIs that pdfjs needs but Node doesn't have ────────────
    // Must run before require('pdf-parse') so pdfjs initializes safely
    const g = globalThis as any;
    if (!g.DOMMatrix)  g.DOMMatrix  = class DOMMatrix  { constructor() {} };
    if (!g.ImageData)  g.ImageData  = class ImageData  { constructor() {} };
    if (!g.Path2D)     g.Path2D     = class Path2D     { constructor() {} };
    if (!g.HTMLCanvasElement) g.HTMLCanvasElement = class HTMLCanvasElement {};

    // ── Dynamic require inside the handler to prevent build-time execution ──
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (
      buf: Buffer,
      opts?: Record<string, unknown>
    ) => Promise<{ text: string; numpages: number }>;

    const formData = await req.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    }

    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large. Maximum is ${maxMB}MB.` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Pass a no-op pagerender to skip canvas rendering entirely
    const parsed = await pdfParse(buffer, { pagerender: () => '' });

    const text = parsed.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!text || text.length < 20) {
      return NextResponse.json({
        error: 'Could not extract text from PDF. The file may be image-only or encrypted.',
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      text,
      pages: parsed.numpages,
      fileName: file.name,
      charCount: text.length,
    });

  } catch (error: any) {
    console.error('[ParsePDF] Error:', error.message);
    return NextResponse.json({ error: 'Failed to parse PDF: ' + error.message }, { status: 500 });
  }
}
