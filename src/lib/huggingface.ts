import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Turns input text into a 384-dimensional vector array.
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const result = await hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: text,
    });
    
    // In many cases featureExtraction returns a nested array [1, shape]. We must flatten it or grab [0]
    // if the model returned batched tokens. The exact type returned is a bit dynamic based on model.
    // If it's a 1D array of numbers, return it. If it's an array of arrays, return the first one.
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0] as number[];
    }
    return result as number[];
  } catch (error: any) {
    console.error("Hugging Face Embedding Error:", error.message);
    throw new Error("Failed to embed text using Hugging Face.");
  }
}
