import { Pinecone } from '@pinecone-database/pinecone';

let _pinecone: Pinecone | null = null;

/**
 * Lazily instantiates the Pinecone client on first call.
 * Avoids module-level initialization which crashes Next.js static build analysis.
 */
function getClient(): Pinecone {
  if (!_pinecone) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('Missing PINECONE_API_KEY environment variable');
    }
    _pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return _pinecone;
}

/**
 * Returns the main Pinecone index for KairoDocs.
 */
export const getIndex = () => getClient().Index('kairodocs');
