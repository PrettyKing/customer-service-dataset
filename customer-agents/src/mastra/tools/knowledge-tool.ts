import { createTool } from "@mastra/core/tools";
import { z } from "zod";


const knowledgeSourceSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  filename: z.string(),
  chunkIndex: z.number(),
  content: z.string(),
  vectorScore: z.number(),
  rerankScore: z.number().nullable()
});
export const knowledgeTool = createTool({
  id: "search-knowledge",
  description:
    "检索商城知识库中的商品说明、退换货政策、退款规则、发票规则和客服处理规范。回答这些事实性问题前必须调用。",
  inputSchema: z.object({
    query: z.string().trim().min(1).describe("用户需要查询的完整问题"),
    topK: z.number().int().min(1).max(6).default(4).describe("返回的知识片段数量")
  }),
  outputSchema: z.object({
    found: z.boolean(),
    message: z.string(),
    sources: z.array(knowledgeSourceSchema)
  }),
  execute: async ({ query, topK }) => {
    const baseUrl = (process.env.RAG_API_URL ?? "http://127.0.0.1:8200").replace(/\/$/, "");
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/search`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ query, top_k: topK, rerank: true }),
        signal: AbortSignal.timeout(30_000)
      });
    } catch (error) {
      throw new Error(`知识库服务暂时不可用：${error instanceof Error ? error.message : String(error)}`);
    }
    if (!response.ok) {
      throw new Error(`知识库服务返回 HTTP ${response.status}：${await response.text()}`);
    }
    const body = await response.json() as {
      results?: Array<{
        document_id: string;
        title: string;
        filename: string;
        chunk_index: number;
        content: string;
        vector_score: number;
        rerank_score: number | null;
      }>;
    };
    const sources = (body.results ?? []).map((item) => ({
      documentId: item.document_id,
      title: item.title,
      filename: item.filename,
      chunkIndex: item.chunk_index,
      content: item.content,
      vectorScore: item.vector_score,
      rerankScore: item.rerank_score
    }));
    return {
      found: sources.length > 0,
      message: sources.length > 0 ? "知识检索成功" : "知识库中没有找到相关依据",
      sources
    };
  }
});
