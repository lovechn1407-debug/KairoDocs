import { NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';
import { embedBatch } from '@/lib/huggingface';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Raise Vercel function timeout to 300s (Pro plan max) so large PDFs finish
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { type, category = '', subType = '', title, text, tags = [], version = '1.0', effectiveDate = '' } = await req.json();

    const trimmedText = (text || '').trim();
    if (!type || !title || !trimmedText) {
      return NextResponse.json({ error: "Missing required fields: type, title, or text" }, { status: 400 });
    }

    console.log(`[Vectorize] Starting: "${title}" | type=${type} | textLength=${trimmedText.length}`);

    // Larger chunks = fewer API calls to HuggingFace. MiniLM handles 512 tokens (~800 chars).
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 600,
      chunkOverlap: 100,
    });

    const chunks = await splitter.createDocuments([trimmedText]);
    console.log(`[Vectorize] Chunks produced: ${chunks.length}`);

    if (chunks.length === 0) {
      return NextResponse.json({ error: "Text produced 0 chunks. Please provide longer or more substantive content." }, { status: 400 });
    }

    // ── Batch embed ALL chunks in one (or a few) HuggingFace API call(s) ───
    // This replaces the old N-sequential-calls loop and is ~10-50x faster.
    const chunkTexts = chunks.map(c => c.pageContent);
    console.log(`[Vectorize] Batch-embedding ${chunkTexts.length} chunks...`);
    const embeddings = await embedBatch(chunkTexts);
    console.log(`[Vectorize] Embeddings complete.`);

    const effectiveDateMs = effectiveDate ? new Date(effectiveDate).getTime() : Date.now();
    const safeTitle = title.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    const vectorIds: string[] = [];

    const vectors = chunkTexts.map((chunkText, i) => {
      const id = `${safeTitle}-v${version}-chunk-${i}-${effectiveDateMs}`;
      vectorIds.push(id);
      return {
        id,
        values: embeddings[i],
        metadata: {
          type,
          category,
          subType,
          title,
          tags: tags.join(','),
          version,
          effectiveDate,
          effectiveDateMs,
          text: chunkText,
        }
      };
    });

    if (vectors.length === 0) {
      return NextResponse.json({ error: "No vectors were generated. Embedding may have failed for all chunks." }, { status: 500 });
    }

    console.log(`[Vectorize] Upserting ${vectors.length} vectors into Pinecone...`);
    const index = getIndex();
    await index.upsert({ records: vectors } as any);
    console.log(`[Vectorize] Upsert complete.`);

    return NextResponse.json({
      success: true,
      message: `Stored ${vectors.length} chunks for "${title}" (${category}${subType ? ' · ' + subType : ''}, v${version}).`,
      chunksStored: vectors.length,
      registryEntry: {
        type, category, subType, title, tags, version, effectiveDate,
        chunkCount: vectors.length,
        vectorIds,
        uploadedAt: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    console.error("Vectorization Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
