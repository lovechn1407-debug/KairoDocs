import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
    if (!file.name.toLowerCase().endsWith('.pdf'))
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: 'File too large. Maximum is 10MB.' }, { status: 400 });

    const buffer = new Uint8Array(await file.arrayBuffer());

    // unpdf is designed specifically for Node.js/serverless — no worker, no canvas needed
    const { extractText } = await import('unpdf');
    const { text: rawText, totalPages } = await extractText(buffer, { mergePages: true });

    const text = (rawText ?? '')
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
      pages: totalPages,
      fileName: file.name,
      charCount: text.length,
    });

  } catch (error: any) {
    console.error('[ParsePDF] Error:', error.message);
    return NextResponse.json({ error: 'Failed to parse PDF: ' + error.message }, { status: 500 });
  }
}
