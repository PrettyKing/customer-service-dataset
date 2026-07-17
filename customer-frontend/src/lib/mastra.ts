import type { KnowledgeSource, MastraResponse, Shipment } from "../types";


const API_URL = (import.meta.env.VITE_MASTRA_API_URL || "/mastra").replace(/\/$/, "");
const AGENT_ID = import.meta.env.VITE_MASTRA_AGENT_ID || "customer-service-agent";

function extractShipment(response: MastraResponse): Shipment | undefined {
  for (const step of response.steps ?? []) {
    for (const toolResult of step.toolResults ?? []) {
      const shipment = toolResult.payload?.result?.shipment;
      if (toolResult.payload?.toolName === "logisticsTool" && shipment) {
        return shipment;
      }
    }
  }
  return undefined;
}

function extractSources(response: MastraResponse): KnowledgeSource[] | undefined {
  for (const step of response.steps ?? []) {
    for (const toolResult of step.toolResults ?? []) {
      const sources = toolResult.payload?.result?.sources;
      if (toolResult.payload?.toolName === "knowledgeTool" && sources?.length) return sources;
    }
  }
  return undefined;
}

export async function checkAgent(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/agents`, {
      headers: { accept: "application/json" }
    });
    if (!response.ok) return false;
    const agents = await response.json() as Record<string, unknown>;
    return AGENT_ID in agents;
  } catch {
    return false;
  }
}

export async function sendToAgent(
  prompt: string,
  session: { resource: string; thread: string },
  signal?: AbortSignal
): Promise<{ text: string; shipment?: Shipment; sources?: KnowledgeSource[] }> {
  const response = await fetch(`${API_URL}/agents/${AGENT_ID}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      memory: session,
      maxSteps: 5,
      modelSettings: { temperature: 0.2, maxTokens: 320 }
    }),
    signal
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Agent 请求失败（HTTP ${response.status}）`);
  }
  const result = await response.json() as MastraResponse;
  if (!result.text?.trim()) {
    throw new Error("Agent 没有返回可显示的内容");
  }
  return { text: result.text, shipment: extractShipment(result), sources: extractSources(result) };
}
