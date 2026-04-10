import { NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

// GET — return all registry entries + Pinecone total vector count
export async function GET() {
  try {
    // Firebase REST API: append auth=... only needed if rules require auth
    // We use .json suffix which works for public-readable nodes
    let entries: any[] = [];
    try {
      const res = await fetch(`${DB_URL}/ragKnowledge.json`);
      const text = await res.text();
      // Firebase returns literal "null" string when node doesn't exist
      if (text && text !== 'null') {
        const data = JSON.parse(text);
        if (data && typeof data === 'object') {
          entries = Object.values(data);
        }
      }
    } catch (fbErr: any) {
      console.warn('[Vectors] Firebase read failed (returning empty list):', fbErr.message);
    }

    // Sort newest first
    entries.sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    let totalVectors = 0;
    try {
      const index = getIndex();
      const stats = await index.describeIndexStats();
      totalVectors = (stats as any).totalRecordCount ?? 0;
    } catch (e: any) {
      console.warn('[Vectors] Pinecone stats fetch failed:', e.message);
    }

    return NextResponse.json({ success: true, entries, totalVectors });
  } catch (error: any) {
    console.error('[Vectors] GET error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove a single registry entry from Firebase and its vectors from Pinecone
export async function DELETE(req: Request) {
  try {
    const { registryId, vectorIds } = await req.json();
    if (!registryId) {
      return NextResponse.json({ error: 'Missing registryId' }, { status: 400 });
    }

    // Remove from Firebase registry
    await fetch(`${DB_URL}/ragKnowledge/${registryId}.json`, { method: 'DELETE' });

    // Remove vectors from Pinecone
    if (vectorIds && vectorIds.length > 0) {
      try {
        const index = getIndex();
        await index.deleteMany(vectorIds);
        console.log(`[Vectors] Deleted ${vectorIds.length} vectors from Pinecone.`);
      } catch (e: any) {
        console.warn('[Vectors] Pinecone delete failed (non-fatal):', e.message);
      }
    }

    return NextResponse.json({ success: true, message: 'Entry deleted.' });
  } catch (error: any) {
    console.error('[Vectors] DELETE error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
