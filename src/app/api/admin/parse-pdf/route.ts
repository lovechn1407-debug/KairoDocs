import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Stub browser-only globals so pdfjs-dist can initialize in Node
    const g = globalThis as any;
    if (!g.DOMMatrix)          g.DOMMatrix          = class {};
    if (!g.ImageData)          g.ImageData          = class {};
    if (!g.Path2D)             g.Path2D             = class {};
    if (!g.HTMLCanvasElement)  g.HTMLCanvasElement  = class {};

    // Dynamic ESM import — avoids the build-time execution that crashes Vercel
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs' as string);
    pdfjs.GlobalWorkerOptions.workerSrc = ''; // disable web worker in Node

    const formData = await req.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
    if (!file.name.toLowerCase().endsWith('.pdf'))
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: 'File too large. Maximum is 10MB.' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false, isEvalSupported: false });
    const doc = await loadingTask.promise;
    const numPages = doc.numPages;

    const pageTexts: string[] = [];
    for (let p = 1; p <= numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const pageText = (content.items as any[])
        .map((item: any) => item.str ?? '')
        .join(' ');
      pageTexts.push(pageText);
    }

    const text = pageTexts
      .join('\n\n')
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
      pages: numPages,
      fileName: file.name,
      charCount: text.length,
    });

  } catch (error: any) {
    console.error('[ParsePDF] Error:', error.message);
    return NextResponse.json({ error: 'Failed to parse PDF: ' + error.message }, { status: 500 });
  }
}
