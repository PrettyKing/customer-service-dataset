import type { MastraDBMessage } from "@mastra/core/agent";
import type { MastraMemory } from "@mastra/core/memory";
import { registerApiRoute } from "@mastra/core/server";


const MAX_TITLE_LENGTH = 60;

type UnknownRecord = Record<string, unknown>;
type RouteHandler<Path extends string> = NonNullable<Parameters<typeof registerApiRoute<Path>>[1]["handler"]>;
type RouteContext<Path extends string> = Parameters<RouteHandler<Path>>[0];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanIdentifier(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length <= 128 ? normalized : null;
}

function cleanTitle(value: unknown, fallback = "新会话"): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, MAX_TITLE_LENGTH) : fallback;
}

function isoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function textFromMessage(message: MastraDBMessage): string {
  const parts = Array.isArray(message.content?.parts) ? message.content.parts : [];
  const text = parts
    .filter((part): part is typeof part & { text: string } => (
      isRecord(part) && part.type === "text" && typeof part.text === "string"
    ))
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n");
  if (text) return text;
  return typeof message.content?.content === "string" ? message.content.content.trim() : "";
}

function findNested<T>(value: unknown, predicate: (candidate: UnknownRecord) => T | undefined): T | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findNested(item, predicate);
      if (match !== undefined) return match;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  const direct = predicate(value);
  if (direct !== undefined) return direct;
  for (const child of Object.values(value)) {
    const match = findNested(child, predicate);
    if (match !== undefined) return match;
  }
  return undefined;
}

function shipmentFromMessage(message: MastraDBMessage): unknown {
  return findNested(message.content.parts, (candidate) => {
    const shipment = candidate.shipment;
    return isRecord(shipment) && typeof shipment.orderId === "string" ? shipment : undefined;
  });
}

function sourcesFromMessage(message: MastraDBMessage): unknown[] | undefined {
  return findNested(message.content.parts, (candidate) => {
    const sources = candidate.sources;
    if (!Array.isArray(sources)) return undefined;
    const valid = sources.filter((source) => (
      isRecord(source) && typeof source.documentId === "string" && typeof source.title === "string"
    ));
    return valid.length ? valid : undefined;
  });
}

interface PublicHistoryMessage {
  id: string;
  role: MastraDBMessage["role"];
  content: string;
  createdAt: string;
  shipment?: unknown;
  sources?: unknown[];
}

function publicMessage(message: MastraDBMessage): PublicHistoryMessage | null {
  const content = textFromMessage(message);
  const shipment = shipmentFromMessage(message);
  const sources = sourcesFromMessage(message);
  if (!content && !shipment && !sources) return null;
  return {
    id: message.id,
    role: message.role,
    content,
    createdAt: isoDate(message.createdAt),
    ...(shipment ? { shipment } : {}),
    ...(sources ? { sources } : {})
  };
}

function publicMessages(messages: MastraDBMessage[]): PublicHistoryMessage[] {
  const result: PublicHistoryMessage[] = [];
  let pendingShipment: unknown;
  let pendingSources: unknown[] | undefined;
  for (const source of messages) {
    const message = publicMessage(source);
    if (!message) continue;
    if (message.role === "assistant") {
      pendingShipment = message.shipment ?? pendingShipment;
      pendingSources = message.sources ?? pendingSources;
      if (!message.content) continue;
      result.push({
        ...message,
        ...(pendingShipment ? { shipment: pendingShipment } : {}),
        ...(pendingSources ? { sources: pendingSources } : {})
      });
      pendingShipment = undefined;
      pendingSources = undefined;
      continue;
    }
    pendingShipment = undefined;
    pendingSources = undefined;
    result.push(message);
  }
  return result;
}

async function routeMemory<Path extends string>(context: RouteContext<Path>): Promise<MastraMemory> {
  const agent = context.get("mastra").getAgentById("customer-service-agent");
  const memory = await agent.getMemory({ requestContext: context.get("requestContext") });
  if (!memory) throw new Error("客服 Agent 尚未配置 Memory");
  return memory;
}

async function ownedThread(memory: MastraMemory, threadId: string, resourceId: string) {
  const thread = await memory.getThreadById({ threadId });
  return thread?.resourceId === resourceId ? thread : null;
}

async function bodyRecord(request: Request): Promise<UnknownRecord> {
  try {
    const body = await request.json() as unknown;
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

const listConversationsRoute = registerApiRoute("/customer/conversations", {
    method: "GET",
    requiresAuth: false,
    handler: async (c: RouteContext<"/customer/conversations">) => {
      const resourceId = cleanIdentifier(c.req.query("resourceId"));
      if (!resourceId) return c.json({ error: "resourceId 不能为空" }, 400);
      const memory = await routeMemory(c);
      const result = await memory.listThreads({
        filter: { resourceId },
        orderBy: { field: "updatedAt", direction: "DESC" },
        perPage: 50
      });
      const conversations = await Promise.all(result.threads.map(async (thread) => {
        const recalled = await memory.recall({
          threadId: thread.id,
          resourceId,
          orderBy: { field: "createdAt", direction: "DESC" },
          perPage: 1
        });
        const preview = recalled.messages.map(textFromMessage).find(Boolean) ?? "暂无消息";
        return {
          id: thread.id,
          resourceId: thread.resourceId,
          title: thread.title || "新会话",
          preview: preview.slice(0, 72),
          createdAt: isoDate(thread.createdAt),
          updatedAt: isoDate(thread.updatedAt)
        };
      }));
      return c.json({ conversations, total: result.total });
    }
  });

const createConversationRoute = registerApiRoute("/customer/conversations", {
    method: "POST",
    requiresAuth: false,
    handler: async (c: RouteContext<"/customer/conversations">) => {
      const body = await bodyRecord(c.req.raw);
      const resourceId = cleanIdentifier(typeof body.resourceId === "string" ? body.resourceId : undefined);
      const requestedId = cleanIdentifier(typeof body.threadId === "string" ? body.threadId : undefined);
      if (!resourceId) return c.json({ error: "resourceId 不能为空" }, 400);
      const memory = await routeMemory(c);
      if (requestedId) {
        const existing = await memory.getThreadById({ threadId: requestedId });
        if (existing && existing.resourceId !== resourceId) {
          return c.json({ error: "会话标识已被占用" }, 409);
        }
        if (existing) {
          return c.json({
            id: existing.id,
            resourceId: existing.resourceId,
            title: existing.title || "新会话",
            preview: "暂无消息",
            createdAt: isoDate(existing.createdAt),
            updatedAt: isoDate(existing.updatedAt)
          });
        }
      }
      const thread = await memory.createThread({
        resourceId,
        ...(requestedId ? { threadId: requestedId } : {}),
        title: cleanTitle(body.title),
        metadata: { channel: "customer-frontend" }
      });
      return c.json({
        id: thread.id,
        resourceId: thread.resourceId,
        title: thread.title || "新会话",
        preview: "暂无消息",
        createdAt: isoDate(thread.createdAt),
        updatedAt: isoDate(thread.updatedAt)
      }, 201);
    }
  });

const getConversationRoute = registerApiRoute("/customer/conversations/:threadId", {
    method: "GET",
    requiresAuth: false,
    handler: async (c: RouteContext<"/customer/conversations/:threadId">) => {
      const threadId = cleanIdentifier(c.req.param("threadId"));
      const resourceId = cleanIdentifier(c.req.query("resourceId"));
      if (!threadId || !resourceId) return c.json({ error: "threadId 和 resourceId 不能为空" }, 400);
      const memory = await routeMemory(c);
      const thread = await ownedThread(memory, threadId, resourceId);
      if (!thread) return c.json({ error: "会话不存在" }, 404);
      const recalled = await memory.recall({
        threadId,
        resourceId,
        orderBy: { field: "createdAt", direction: "ASC" },
        perPage: false
      });
      const messages = publicMessages(recalled.messages.filter(
        (message) => message.role === "user" || message.role === "assistant"
      ));
      return c.json({
        conversation: {
          id: thread.id,
          resourceId: thread.resourceId,
          title: thread.title || "新会话",
          createdAt: isoDate(thread.createdAt),
          updatedAt: isoDate(thread.updatedAt)
        },
        messages
      });
    }
  });

const updateConversationRoute = registerApiRoute("/customer/conversations/:threadId", {
    method: "PATCH",
    requiresAuth: false,
    handler: async (c: RouteContext<"/customer/conversations/:threadId">) => {
      const threadId = cleanIdentifier(c.req.param("threadId"));
      const body = await bodyRecord(c.req.raw);
      const resourceId = cleanIdentifier(typeof body.resourceId === "string" ? body.resourceId : undefined);
      if (!threadId || !resourceId) return c.json({ error: "threadId 和 resourceId 不能为空" }, 400);
      const memory = await routeMemory(c);
      const existing = await ownedThread(memory, threadId, resourceId);
      if (!existing) return c.json({ error: "会话不存在" }, 404);
      const thread = await memory.updateThread({
        id: threadId,
        title: cleanTitle(body.title, existing.title || "新会话"),
        metadata: existing.metadata ?? {}
      });
      return c.json({
        id: thread.id,
        resourceId: thread.resourceId,
        title: thread.title || "新会话",
        createdAt: isoDate(thread.createdAt),
        updatedAt: isoDate(thread.updatedAt)
      });
    }
  });

const deleteConversationRoute = registerApiRoute("/customer/conversations/:threadId", {
    method: "DELETE",
    requiresAuth: false,
    handler: async (c: RouteContext<"/customer/conversations/:threadId">) => {
      const threadId = cleanIdentifier(c.req.param("threadId"));
      const resourceId = cleanIdentifier(c.req.query("resourceId"));
      if (!threadId || !resourceId) return c.json({ error: "threadId 和 resourceId 不能为空" }, 400);
      const memory = await routeMemory(c);
      if (!await ownedThread(memory, threadId, resourceId)) return c.json({ error: "会话不存在" }, 404);
      await memory.deleteThread(threadId);
      return c.json({ deleted: true });
    }
  });

export const conversationRoutes = [
  listConversationsRoute,
  createConversationRoute,
  getConversationRoute,
  updateConversationRoute,
  deleteConversationRoute
];
