import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  console.warn("Missing PINECONE_API_KEY environment variable");
}

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

/**
 * Returns the main Pinecone index for KairoDocs.
 */
export const getIndex = () => pinecone.Index('kairodocs');
