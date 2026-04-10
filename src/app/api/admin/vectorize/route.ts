import { NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';
import { embedText } from '@/lib/huggingface';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export async function POST(req: Request) {
  try {
    const { type, title, text, tags = [], version = '1.0', effectiveDate = '' } = await req.json();

    const trimmedText = (text || '').trim();
    if (!type || !title || !trimmedText) {
      return NextResponse.json({ error: "Missing required fields: type, title, or text" }, { status: 400 });
    }

    console.log(`[Vectorize] Starting: "${title}" | type=${type} | textLength=${trimmedText.length}`);

    // MiniLM-L6-v2 has a ~256 token window (~400 chars).
    // We use chunks of 400 chars with 80-char overlap so no sentence boundary is lost.
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 400,
      chunkOverlap: 80,
    });

    const chunks = await splitter.createDocuments([trimmedText]);
    console.log(`[Vectorize] Chunks produced: ${chunks.length}`);

    if (chunks.length === 0) {
      return NextResponse.json({ error: "Text produced 0 chunks. Please provide longer or more substantive content." }, { status: 400 });
    }

    const effectiveDateMs = effectiveDate ? new Date(effectiveDate).getTime() : Date.now();
    const safeTitle = title.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    const vectorIds: string[] = [];

    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i].pageContent;
      const embedding = await embedText(chunkText);
      const id = `${safeTitle}-v${version}-chunk-${i}-${effectiveDateMs}`;
      vectorIds.push(id);

      vectors.push({
        id,
        values: embedding,
        metadata: {
          type,
          title,
          tags: tags.join(','),
          version,
          effectiveDate,
          effectiveDateMs,
          text: chunkText,
        }
      });
    }

    if (vectors.length === 0) {
      return NextResponse.json({ error: "No vectors were generated. Embedding may have failed for all chunks." }, { status: 500 });
    }

    console.log(`[Vectorize] Upserting ${vectors.length} vectors into Pinecone...`);
    const index = getIndex();
    await index.upsert({ records: vectors } as any);
    console.log(`[Vectorize] Upsert complete.`);

    // Save document registry entry to Firebase for the "view knowledge" panel
    try {
      const pushRes = await fetch(`${DB_URL}/ragKnowledge.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, title, tags, version, effectiveDate,
          chunkCount: vectors.length,
          vectorIds,
          uploadedAt: new Date().toISOString(),
        }),
      });
      const pushData = await pushRes.json();
      // Firebase POST returns { name: "-Nxxx" } — update the entry with its own ID
      if (pushData?.name) {
        await fetch(`${DB_URL}/ragKnowledge/${pushData.name}/id.json`, {
          method: 'PUT',
          body: JSON.stringify(pushData.name),
        });
      }
      console.log(`[Vectorize] Registry entry saved: ${pushData?.name}`);
    } catch (fbErr: any) {
      console.warn('[Vectorize] Firebase registry write failed (non-fatal):', fbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully vectorized and stored ${vectors.length} chunks for "${title}" (v${version}, ${tags.length} tag(s)).`,
      chunksStored: vectors.length
    });

  } catch (error: any) {
    console.error("Vectorization Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
