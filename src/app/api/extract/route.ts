import { NextResponse } from "next/server";
import { getIndex } from "@/lib/pinecone";
import { embedText } from "@/lib/huggingface";
import { marked } from "marked";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
const GEMINI_MODELS = [
  { model: "gemini-2.0-flash", version: "v1beta" },
  { model: "gemini-1.5-flash", version: "v1" },
];

async function callGroq(prompt: string): Promise<string | null> {
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 6000,
        }),
      });
      const data = await res.json();
      if (!res.ok) { console.warn(`[Groq] ${model}: ${data?.error?.message}`); continue; }
      const text = data?.choices?.[0]?.message?.content;
      if (text) { console.log(`[Groq] ✓ ${model}`); return text; }
    } catch (e: any) { console.warn(`[Groq] ${model}: ${e.message}`); }
  }
  return null;
}

async function callGemini(prompt: string): Promise<string | null> {
  for (const { model, version } of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 6000 },
        }),
      });
      const data = await res.json();
      if (!res.ok) { console.warn(`[Gemini] ${model}: ${data?.error?.message}`); continue; }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) { console.log(`[Gemini] ✓ ${model}`); return text; }
    } catch (e: any) { console.warn(`[Gemini] ${model}: ${e.message}`); }
  }
  return null;
}

async function callAI(prompt: string): Promise<string> {
  const result = await callGroq(prompt) || await callGemini(prompt);
  if (!result) throw new Error("All AI providers failed. Please check your API keys.");
  return result;
}

export async function POST(req: Request) {
  try {
    const { text, templateName } = await req.json();

    if (!text) return NextResponse.json({ error: "No user document text provided" }, { status: 400 });

    const docText = text.substring(0, 25000); // Prevent context blowout
    let templatesText = "No direct active templates found in vectors.";
    let precedentsText = "No precedents found in vectors.";

    // Pinecone Retrieval — two separate filtered queries for precision
    if (templateName) {
      try {
        const queryVector = await embedText(templateName);
        const index = getIndex();

        // Source 1: Institutional Templates — filter strictly by type=template
        const templateRes = await index.query({
          vector: queryVector,
          topK: 4,
          includeMetadata: true,
          filter: { type: { $eq: "template" } }
        });

        if (templateRes.matches && templateRes.matches.length > 0) {
          // Sort by recency (highest effectiveDateMs first) to prefer newest policies
          const sorted = [...templateRes.matches].sort(
            (a, b) => ((b.metadata?.effectiveDateMs as number) || 0) - ((a.metadata?.effectiveDateMs as number) || 0)
          );
          templatesText = sorted.map((t, i) => {
            const meta = t.metadata;
            const header = `--- Template: "${meta?.title}" | v${meta?.version || '?'} | Effective: ${meta?.effectiveDate || 'Unknown'} ---`;
            return `${header}\n${meta?.text}`;
          }).join("\n\n");
        }

        // Source 3: Historical Precedents — filter strictly by type=precedent
        const precedentRes = await index.query({
          vector: queryVector,
          topK: 3,
          includeMetadata: true,
          filter: { type: { $eq: "precedent" } }
        });

        if (precedentRes.matches && precedentRes.matches.length > 0) {
          const sorted = [...precedentRes.matches].sort(
            (a, b) => ((b.metadata?.effectiveDateMs as number) || 0) - ((a.metadata?.effectiveDateMs as number) || 0)
          );
          precedentsText = sorted.map((p, i) => {
            const meta = p.metadata;
            const header = `--- Precedent: "${meta?.title}" | Tags: ${meta?.tags || 'none'} ---`;
            return `${header}\n${meta?.text}`;
          }).join("\n\n");
        }

      } catch (e) {
        console.warn("Pinecone Vector Query Failed (continuing without RAG context):", e);
      }
    }


    // Assemble structured prompt
    const prompt = `Context Blocks (The RAG Input):

SOURCE 1: Institutional Templates & Clauses
${templatesText}

SOURCE 2: Startup Project Data (Unstructured)
${docText}

SOURCE 3: Historical Precedents
${precedentsText}

Task Instructions:
1. Identify & Extract: Locate the specific names, dates, budgets, and scopes of work within Source 2.
2. Cross-Reference: Compare the startup's requirements against the mandatory clauses in Source 1. If there is a conflict (e.g., the startup wants 100% IP, but the institution requires 10%), prioritize Source 1 and add a comment for human review.
3. Drafting: Generate a structured document in Markdown format that mimics a .docx structure based on Source 1 guidelines natively. Use professional, domain-specific terminology.
4. Gap Analysis: If any information required by the template in Source 1 is missing from Source 2, do not hallucinate. Instead, insert a placeholder like [MISSING: PLEASE PROVIDE PAYMENT SCHEDULE] in the draft, and list these in Validation Notes.

Output Format Requirements:
You must strictly format your entire final response as follows, with no opening conversational remarks. Do not change the block labels.

Document Title: [Name of Document]

Draft Content:
[The generated document text as structurally beautiful Markdown formatting. Render headers, bolded clauses, bullets, and any required tables using markdown.]

Validation Notes:
[List any discrepancies or missing data found during RAG analysis. If none, say "All requirements met."]
`;

    const rawOutput = await callAI(prompt);

    // Parse output based on predictable structure
    const titleMatch = rawOutput.match(/Document Title:\s*(.*)/i);
    const notesMatch = rawOutput.match(/Validation Notes:([\s\S]*)/i);
    
    // Draft content is between "Draft Content:" and "Validation Notes:"
    const contentRegex = /Draft Content:\s*([\s\S]*?)Validation Notes:/i;
    const contentMatch = rawOutput.match(contentRegex);

    const title = titleMatch ? titleMatch[1].trim() : templateName || "Generated Document";
    const validationNotes = notesMatch ? notesMatch[1].trim() : "Unable to parse validation notes.";
    const markdownDraft = contentMatch ? contentMatch[1].trim() : rawOutput;

    // Convert Draft markdown into raw HTML asynchronously via marked
    const htmlDraft = await marked.parse(markdownDraft);

    return NextResponse.json({ 
      success: true, 
      title,
      validationNotes,
      draftHtml: htmlDraft
    });

  } catch (error: any) {
    console.error("[RAG AI] Final error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
