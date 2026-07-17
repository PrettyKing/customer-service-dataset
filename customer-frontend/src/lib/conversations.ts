import type { ConversationDetail, ConversationSummary } from "../types";


const API_URL = (import.meta.env.VITE_MASTRA_CUSTOM_API_URL || "/agent-api").replace(/\/$/, "");

async function jsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `会话请求失败（HTTP ${response.status}）`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      // Keep the HTTP error when the response is not JSON.
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export async function listConversations(resourceId: string): Promise<ConversationSummary[]> {
  const response = await fetch(`${API_URL}/customer/conversations?resourceId=${encodeURIComponent(resourceId)}`);
  const result = await jsonResponse<{ conversations: ConversationSummary[] }>(response);
  return result.conversations;
}

export async function createConversation(
  resourceId: string,
  options: { threadId?: string; title?: string } = {}
): Promise<ConversationSummary> {
  const response = await fetch(`${API_URL}/customer/conversations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ resourceId, ...options })
  });
  return jsonResponse<ConversationSummary>(response);
}

export async function getConversation(resourceId: string, threadId: string): Promise<ConversationDetail> {
  const response = await fetch(
    `${API_URL}/customer/conversations/${encodeURIComponent(threadId)}?resourceId=${encodeURIComponent(resourceId)}`
  );
  return jsonResponse<ConversationDetail>(response);
}

export async function renameConversation(
  resourceId: string,
  threadId: string,
  title: string
): Promise<void> {
  const response = await fetch(`${API_URL}/customer/conversations/${encodeURIComponent(threadId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ resourceId, title })
  });
  await jsonResponse(response);
}

export async function deleteConversation(resourceId: string, threadId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/customer/conversations/${encodeURIComponent(threadId)}?resourceId=${encodeURIComponent(resourceId)}`,
    { method: "DELETE" }
  );
  await jsonResponse(response);
}
