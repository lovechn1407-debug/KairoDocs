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

/**
 * Turns input text into a 384-dimensional vector array using MiniLM-L6-v2.
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const hf = getClient();
    const result = await hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: text,
    });

    // featureExtraction may return a nested array [1 x 384] or flat [384].
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0] as number[];
    }
    return result as number[];
  } catch (error: any) {
    // Log the full error for Vercel function logs
    console.error("Hugging Face Embedding Error:", error?.message, error?.response?.status, JSON.stringify(error?.response?.data));
    throw new Error(`Failed to embed text using Hugging Face: ${error?.message || 'Unknown error'}`);
  }
}
