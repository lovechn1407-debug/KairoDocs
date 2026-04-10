import { NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    // 1. Delete ALL vectors from Pinecone
    console.log('[Reset] Deleting all vectors from Pinecone...');
    const index = getIndex();
    await index.deleteAll();
    console.log('[Reset] Pinecone cleared.');

    return NextResponse.json({ success: true, message: 'All Pinecone vectors have been deleted. Firebase registry is untouched.' });
  } catch (error: any) {
    console.error('[Reset] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
