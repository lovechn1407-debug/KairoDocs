import { NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
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
    const parsed = await pdfParse(buffer);

    const text = parsed.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!text || text.length < 20) {
      return NextResponse.json({ error: 'Could not extract text from PDF. The file may be image-only or encrypted.' }, { status: 422 });
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
