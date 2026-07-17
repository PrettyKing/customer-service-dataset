import cors from "cors";
import express from "express";

import { shipments } from "./data.js";


function normalize(value) {
  return String(value ?? "").trim().toUpperCase();
}
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "mock-logistics-api" });
  });

  app.get("/api/logistics", (request, response) => {
    const orderId = normalize(request.query.orderId);
    const trackingNumber = normalize(request.query.trackingNumber);
    if (!orderId && !trackingNumber) {
      return response.status(400).json({
        code: "INVALID_QUERY",
        message: "请提供 orderId 或 trackingNumber"
      });
    }

    const shipment = shipments.find((item) =>
      (orderId && normalize(item.orderId) === orderId) ||
      (trackingNumber && normalize(item.trackingNumber) === trackingNumber)
    );
    if (!shipment) {
      return response.status(404).json({
        code: "LOGISTICS_NOT_FOUND",
        message: "未查询到对应的物流信息"
      });
    }
    return response.json({ success: true, data: shipment });
  });

  app.get("/api/orders/:orderId/logistics", (request, response) => {
    const shipment = shipments.find(
      (item) => normalize(item.orderId) === normalize(request.params.orderId)
    );
    if (!shipment) {
      return response.status(404).json({
        code: "LOGISTICS_NOT_FOUND",
        message: "未查询到该订单的物流信息"
      });
    }
    return response.json({ success: true, data: shipment });
  });

  app.get("/api/mock/orders", (_request, response) => {
    response.json({ success: true, data: shipments });
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ code: "INTERNAL_ERROR", message: "Mock 服务内部错误" });
  });

  return app;
}
