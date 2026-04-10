import { NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';
import { embedText } from '@/lib/huggingface';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export async function POST(req: Request) {
  try {
    const { type, title, text } = await req.json();

    if (!type || !title || !text) {
      return NextResponse.json({ error: "Missing required fields: type, title, or text" }, { status: 400 });
    }

    // Split large documents into manageable chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500, // 500 characters
      chunkOverlap: 50,
    });

    const chunks = await splitter.createDocuments([text]);

    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i].pageContent;
      
      // Calculate 384-dimensional vector using Hugging Face
      const embedding = await embedText(chunkText);
      
      vectors.push({
        id: `${title.replace(/\s+/g, '-').toLowerCase()}-chunk-${i}`,
        values: embedding,
        metadata: {
          type,     // "template" or "precedent"
          title,
          text: chunkText,
        }
      });
    }

    // Upsert vectors into Pinecone
    const index = getIndex();
    await index.upsert(vectors);

    return NextResponse.json({
      success: true,
      message: `Successfully vectorized and stored ${vectors.length} chunks.`,
      chunksStored: vectors.length
    });

  } catch (error: any) {
    console.error("Vectorization Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
