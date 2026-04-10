import { NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';
import { embedText } from '@/lib/huggingface';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

/** Strip HTML tags to get plain text for embedding */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function POST(req: Request) {
  try {
    const { documentContent, projectName, templateName, submissionId, userEmail } = await req.json();

    if (!documentContent || !projectName) {
      return NextResponse.json({ error: 'Missing documentContent or projectName' }, { status: 400 });
    }

    const plainText = stripHtml(documentContent);
    if (plainText.length < 50) {
      // Document too short to be worth indexing — skip silently
      return NextResponse.json({ success: true, message: 'Document too short to index, skipped.', chunksStored: 0 });
    }

    console.log(`[IngestApproved] Indexing approved doc: "${projectName}" (${plainText.length} chars)`);

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 400, chunkOverlap: 80 });
    const chunks = await splitter.createDocuments([plainText]);

    if (chunks.length === 0) {
      return NextResponse.json({ success: true, message: 'No chunks produced.', chunksStored: 0 });
    }

    const safeTitle = projectName.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    const effectiveDateMs = Date.now();
    const vectorIds: string[] = [];
    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i].pageContent;
      const embedding = await embedText(chunkText);
      const id = `approved-${safeTitle}-${submissionId ?? effectiveDateMs}-chunk-${i}`;
      vectorIds.push(id);

      vectors.push({
        id,
        values: embedding,
        metadata: {
          type: 'precedent',
          title: `${projectName} (Approved)`,
          tags: ['approved', templateName ?? 'document', 'auto-ingested'].join(','),
          version: '1.0',
          effectiveDate: new Date().toISOString().split('T')[0],
          effectiveDateMs,
          userEmail: userEmail ?? '',
          submissionId: submissionId ?? '',
          text: chunkText,
        }
      });
    }

    const index = getIndex();
    await index.upsert({ records: vectors } as any);
    console.log(`[IngestApproved] Upserted ${vectors.length} precedent vectors.`);

    // Register in Firebase for the knowledge viewer
    try {
      const pushRes = await fetch(`${DB_URL}/ragKnowledge.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'precedent',
          title: `${projectName} (Approved)`,
          tags: ['approved', templateName ?? 'document', 'auto-ingested'],
          version: '1.0',
          effectiveDate: new Date().toISOString().split('T')[0],
          chunkCount: vectors.length,
          vectorIds,
          uploadedAt: new Date().toISOString(),
          autoIngested: true,
          submissionId: submissionId ?? '',
        }),
      });
      const pushData = await pushRes.json();
      if (pushData?.name) {
        await fetch(`${DB_URL}/ragKnowledge/${pushData.name}/id.json`, {
          method: 'PUT',
          body: JSON.stringify(pushData.name),
        });
      }
    } catch (fbErr: any) {
      console.warn('[IngestApproved] Firebase registry write failed (non-fatal):', fbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Auto-ingested "${projectName}" as precedent (${vectors.length} chunks).`,
      chunksStored: vectors.length,
    });

  } catch (error: any) {
    console.error('[IngestApproved] Error:', error.message);
    // Non-fatal — don't block the approval flow
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
