import { NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

async function firebaseGet(path: string) {
  const res = await fetch(`${DB_URL}/${path}.json`);
  if (!res.ok) throw new Error(`Firebase GET failed: ${res.status}`);
  return res.json();
}

async function firebaseDelete(path: string) {
  const res = await fetch(`${DB_URL}/${path}.json`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Firebase DELETE failed: ${res.status}`);
}

// GET — return all registry entries + Pinecone total vector count
export async function GET() {
  try {
    const data = await firebaseGet('ragKnowledge');
    const entries = data ? Object.values(data) : [];

    let totalVectors = 0;
    try {
      const index = getIndex();
      const stats = await index.describeIndexStats();
      totalVectors = (stats as any).totalRecordCount ?? (stats as any).totalVectorCount ?? 0;
    } catch (e) {
      console.warn('[Vectors] Pinecone stats fetch failed:', e);
    }

    return NextResponse.json({ success: true, entries, totalVectors });
  } catch (error: any) {
    console.error('[Vectors] GET error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove registry entry from Firebase and vectors from Pinecone
export async function DELETE(req: Request) {
  try {
    const { registryId, vectorIds } = await req.json();
    if (!registryId) {
      return NextResponse.json({ error: 'Missing registryId' }, { status: 400 });
    }

    await firebaseDelete(`ragKnowledge/${registryId}`);

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
