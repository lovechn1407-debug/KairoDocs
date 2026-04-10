import { NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export async function DELETE() {
  try {
    // 1. Delete ALL vectors from Pinecone
    console.log('[Reset] Deleting all vectors from Pinecone...');
    const index = getIndex();
    await index.deleteAll();
    console.log('[Reset] Pinecone cleared.');

    // 2. Clear the Firebase ragKnowledge registry
    console.log('[Reset] Clearing Firebase ragKnowledge registry...');
    await fetch(`${DB_URL}/ragKnowledge.json`, { method: 'DELETE' });
    console.log('[Reset] Firebase registry cleared.');

    return NextResponse.json({ success: true, message: 'All vectors and registry entries have been deleted.' });
  } catch (error: any) {
    console.error('[Reset] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
