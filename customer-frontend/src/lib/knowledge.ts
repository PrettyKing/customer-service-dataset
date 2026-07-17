import type { KnowledgeDocument, KnowledgeSearchResult } from "../types";


const API_URL = (import.meta.env.VITE_RAG_API_URL || "/rag").replace(/\/$/, "");

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { detail?: string };
    return body.detail || `请求失败（HTTP ${response.status}）`;
  } catch {
    return `请求失败（HTTP ${response.status}）`;
  }
}

export async function listDocuments(): Promise<KnowledgeDocument[]> {
  const response = await fetch(`${API_URL}/documents`);
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<KnowledgeDocument[]>;
}

export async function uploadDocument(file: File, title?: string): Promise<KnowledgeDocument> {
  const form = new FormData();
  form.append("file", file);
  if (title?.trim()) form.append("title", title.trim());
  const response = await fetch(`${API_URL}/documents`, { method: "POST", body: form });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<KnowledgeDocument>;
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function searchKnowledge(query: string): Promise<{ results: KnowledgeSearchResult[]; reranked: boolean }> {
  const response = await fetch(`${API_URL}/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, top_k: 5, rerank: true })
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<{ results: KnowledgeSearchResult[]; reranked: boolean }>;
}
