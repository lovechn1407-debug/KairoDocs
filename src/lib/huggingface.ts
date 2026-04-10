import { HfInference } from '@huggingface/inference';

let _hf: HfInference | null = null;

function getClient(): HfInference {
  if (!_hf) {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error('Missing HUGGINGFACE_API_KEY environment variable');
    }
    _hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
  }
  return _hf;
}

const MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

/**
 * Embed a single text string → 384-dim vector.
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const hf = getClient();
    const result = await hf.featureExtraction({ model: MODEL, inputs: text });
    if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as number[];
    return result as number[];
  } catch (error: any) {
    console.error('HuggingFace embedText error:', error?.message);
    throw new Error(`Failed to embed text using Hugging Face: ${error?.message ?? 'Unknown error'}`);
  }
}

/**
 * Embed multiple texts in a SINGLE API call → array of 384-dim vectors.
 * Dramatically faster than calling embedText() N times for N chunks.
 * HF featureExtraction supports array inputs natively.
 * Automatically falls back to sequential batches of 32 if the array is large.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 32; // HuggingFace free tier is comfortable with 32 at a time
  const hf = getClient();
  const results: number[][] = [];

  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE);
    console.log(`[embedBatch] Embedding batch ${start / BATCH_SIZE + 1} / ${Math.ceil(texts.length / BATCH_SIZE)} (${batch.length} chunks)`);
    try {
      const result = await hf.featureExtraction({ model: MODEL, inputs: batch });
      // featureExtraction with array input returns number[][] (one vector per input)
      if (Array.isArray(result) && Array.isArray(result[0])) {
        results.push(...(result as number[][]));
      } else {
        // Unexpected shape: try to recover by treating as single vector
        results.push(result as number[]);
      }
    } catch (error: any) {
      console.error('HuggingFace embedBatch error:', error?.message);
      throw new Error(`Failed to batch-embed chunks: ${error?.message ?? 'Unknown error'}`);
    }
  }
  return results;
}
