import { NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
const GEMINI_MODELS = [
  { model: "gemini-2.0-flash", version: "v1beta" },
  { model: "gemini-1.5-flash", version: "v1" },
];

// ─── JSON array → styled HTML table ─────────────────────────────────────────
function jsonToHtmlTable(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return "<p><em>No data found</em></p>";
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(h =>
    `<th style="border:1px solid #cbd5e1;padding:8px 12px;background:#f1f5f9;font-weight:600;text-align:left;white-space:nowrap">${h}</th>`
  ).join("");
  const bodyRows = rows.map(row =>
    `<tr>${headers.map(h =>
      `<td style="border:1px solid #cbd5e1;padding:8px 12px">${row[h] ?? ""}</td>`
    ).join("")}</tr>`
  ).join("\n");
  return `
<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:14px">
  <thead><tr>${headerRow}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>`;
}

// ─── AI callers ──────────────────────────────────────────────────────────────
async function callGroq(prompt: string): Promise<string | null> {
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a precise AI that extracts data from documents. Return ONLY valid raw JSON — no markdown, no code fences, no explanation." },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 4096,
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
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
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

function cleanJSON(raw: string): any {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

// ─── Main Route ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { text, variables } = await req.json();

    if (!text) return NextResponse.json({ error: "No document text provided" }, { status: 400 });
    if (!variables?.length) return NextResponse.json({ error: "No variables to extract" }, { status: 400 });

    const docText = text.substring(0, 28000);

    // Separate scalar variables from dynamic table variables
    const scalarVars = variables.filter((v: string) => !v.startsWith("TABLE:"));
    const tableVars  = variables.filter((v: string) => v.startsWith("TABLE:"));

    const extractedData: Record<string, string> = {};

    // ── 1. Extract scalar fields ─────────────────────────────────────────
    if (scalarVars.length > 0) {
      const schema = scalarVars.reduce((acc: any, v: string) => {
        acc[v] = `extracted value for ${v}`;
        return acc;
      }, {});

      const prompt = `You are an AI that extracts information from legal documents.
Read the document text below and extract the requested fields.
If a field is not found, write "Not Found".
Return ONLY a raw JSON object — no markdown, no code fences.

Fields to extract:
${JSON.stringify(schema, null, 2)}

Document:
"""
${docText}
"""`;

      const raw = await callAI(prompt);
      const parsed = cleanJSON(raw);
      Object.assign(extractedData, parsed);
    }

    // ── 2. Extract dynamic tables ─────────────────────────────────────────
    for (const tableVar of tableVars) {
      // TABLE:PRODUCTS → "PRODUCTS"
      const tableName = tableVar.replace("TABLE:", "");

      const prompt = `You are an AI that extracts tabular data from documents.
Find the table related to "${tableName}" in the document below.
Extract ALL rows from that table. Include all columns you find, regardless of how many there are.
If you don't find a matching table, return an empty array [].

Return ONLY a raw JSON ARRAY of objects — one object per row, keys = column names.
No markdown, no code fences, no explanation.

Example output format:
[{"Product":"Widget A","Qty":"10","Price":"₹500"},{"Product":"Widget B","Qty":"5","Price":"₹200"}]

Document:
"""
${docText}
"""`;

      try {
        const raw = await callAI(prompt);
        const parsed = cleanJSON(raw);
        if (Array.isArray(parsed)) {
          // Convert to HTML table and store
          extractedData[tableVar] = jsonToHtmlTable(parsed);
        } else {
          extractedData[tableVar] = "<em>Could not extract table data</em>";
        }
      } catch (e) {
        extractedData[tableVar] = "<em>Table extraction failed</em>";
      }
    }

    return NextResponse.json({ success: true, extractedData });

  } catch (error: any) {
    console.error("[AI] Final error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
