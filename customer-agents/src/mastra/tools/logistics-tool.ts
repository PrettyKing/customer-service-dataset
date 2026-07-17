import { createTool } from "@mastra/core/tools";
import { z } from "zod";


const logisticsResultSchema = z.object({
  found: z.boolean(),
  message: z.string(),
  shipment: z.object({
    orderId: z.string(),
    trackingNumber: z.string().nullable(),
    carrier: z.string().nullable(),
    status: z.string(),
    statusText: z.string(),
    estimatedDelivery: z.string().nullable(),
    receiver: z.string(),
    receiverPhone: z.string(),
    latestEvent: z.string(),
    events: z.array(z.object({
      time: z.string(),
      location: z.string(),
      description: z.string()
    }))
  }).optional()
});
export const logisticsTool = createTool({
  id: "query-logistics",
  description:
    "根据订单号或物流单号查询实时物流状态、承运商、预计送达时间和物流轨迹。用户询问发货、快递、配送、签收时必须调用。",
  inputSchema: z.object({
    orderId: z.string().trim().optional().describe("商城订单号，例如 ORD-20260717-001"),
    trackingNumber: z.string().trim().optional().describe("快递物流单号，例如 SF1234567890")
  }).refine((input) => input.orderId || input.trackingNumber, {
    message: "orderId 和 trackingNumber 至少提供一个"
  }),
  outputSchema: logisticsResultSchema,
  execute: async ({ orderId, trackingNumber }) => {
    const baseUrl = (process.env.LOGISTICS_API_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
    const query = new URLSearchParams();
    if (orderId) query.set("orderId", orderId);
    if (trackingNumber) query.set("trackingNumber", trackingNumber);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/logistics?${query}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(5000)
      });
    } catch (error) {
      throw new Error(`物流服务暂时不可用：${error instanceof Error ? error.message : String(error)}`);
    }

    const body = await response.json() as {
      message?: string;
      data?: z.infer<typeof logisticsResultSchema>["shipment"];
    };
    if (response.status === 404) {
      return { found: false, message: body.message ?? "未查询到物流信息" };
    }
    if (!response.ok || !body.data) {
      throw new Error(body.message ?? `物流服务返回 HTTP ${response.status}`);
    }
    return {
      found: true,
      message: "物流查询成功",
      shipment: body.data
    };
  }
});
