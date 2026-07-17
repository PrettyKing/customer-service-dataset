# Mastra 中文客服 Agent

使用 Mastra 构建的中文客服 Agent：

- 模型：本地 Qwen3-8B QLoRA OpenAI 兼容接口
- Tool：Mock 物流查询和 Qdrant RAG 知识检索
- Memory：LibSQL 服务端持久化多轮消息
- Studio/API：Mastra 本地开发服务器

## 服务依赖

启动顺序：

1. `customer-http-qlora`，默认 `http://127.0.0.1:8000`
2. `customer-frontend-logistics-api`，默认 `http://127.0.0.1:3100`
3. `customer-rag-api`，默认 `http://127.0.0.1:8200`
4. 当前 Mastra 项目，默认 `http://localhost:4111`

## 安装与启动

完整联调推荐从仓库根目录启动：

```powershell
cd G:\customer-service-dataset
pnpm install
pnpm dev
```

仅启动 Mastra Agent：

```powershell
cd G:\customer-service-dataset
pnpm dev:agents
```

默认配置无需创建 `.env`；需要修改 QLoRA 或物流地址时，可将 `customer-agents/.env.example` 复制为 `customer-agents/.env`。

浏览器打开 <http://127.0.0.1:4111>，选择“中文电商客服 Agent”。项目将 Mastra 监听地址和 Studio 实例地址统一固定为 `127.0.0.1`，避免浏览器在 `localhost` 与 `127.0.0.1` 之间跨主机访问失败。

Mastra API 地址为 `http://127.0.0.1:4111/api`，Agent ID 为 `customer-service-agent`。

Studio Chat 使用流式 Agent 接口。下游 QLoRA OpenAI 兼容服务需要支持 `stream=true` 的 SSE 响应；本仓库的 `customer-http-qlora` 已实现该协议，因此 Studio、Tool Call 和自定义客服前端可以共用同一个 Agent。

```powershell
$body = @{
  messages = @(
    @{ role = "user"; content = "帮我查一下订单 ORD-20260717-001 到哪里了？" }
  )
  memory = @{
    resource = "demo-user"
    thread = "demo-conversation"
  }
  maxSteps = 5
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri http://127.0.0.1:4111/api/agents/customer-service-agent/generate `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body $body
```

建议测试：

```text
帮我查一下订单 ORD-20260717-001 到哪里了？
```

Agent 应调用 `query-logistics` Tool，并回答顺丰快件正在运输中。

知识库测试：

```text
商品有质量问题，申请退货需要提供什么材料？
```

Agent 应调用 `search-knowledge` Tool，只依据检索片段回答，并标注文档标题。

## 多轮记忆

Agent 使用 LibSQL 将消息、回复和 Tool 结果持久化到 `customer-agents/.data/customer-service.db`。请求需要传入稳定的会话标识：

```json
{
  "messages": [{ "role": "user", "content": "请记住我的称呼是小林" }],
  "memory": {
    "resource": "user-123",
    "thread": "conversation-123"
  }
}
```

同一用户可以拥有多个 thread；thread 创建后不能改归其他 resource。

前端不会重复回传全部历史，只提交本轮消息。Agent 根据 `resource/thread` 从服务端恢复最近 20 条消息，因此刷新页面、切换会话后仍能继续上下文。

前端历史会话使用以下自定义接口，全部会校验 thread 是否属于传入的 resource：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` / `POST` | `/customer/conversations` | 查询或创建会话 |
| `GET` | `/customer/conversations/:threadId` | 恢复完整消息 |
| `PATCH` | `/customer/conversations/:threadId` | 修改会话名称 |
| `DELETE` | `/customer/conversations/:threadId` | 删除会话及其消息 |

列表接口按更新时间倒序返回最多 50 个会话，并附带最后一条消息预览。详情接口按时间正序返回用户和助手消息，同时把持久化的物流结果、RAG 来源重新合并到对应回复中。

这些路径是 Mastra 自定义路由，不带内置接口的 `/api` 前缀。前端开发环境使用 `/agent-api` 代理访问。当前路由设置了 `requiresAuth: false`，仅面向本地匿名演示；生产环境必须接入登录鉴权，并从服务端会话中取得 resource ID。

## RAG 在 Agent 中的调用链

1. 用户询问退换货、退款、发票、商品说明或售后政策。
2. Agent 根据系统规则调用 `search-knowledge` Tool。
3. Tool 请求 `RAG_API_URL/api/search`，获取 Qdrant 向量召回和可选 Rerank 结果。
4. Agent 只依据检索片段组织答案，并在正文末尾标注文档标题。
5. Tool 返回的来源随消息写入 Memory，历史会话恢复时仍可显示来源标签。

若知识库没有依据，Agent 应提示需要核实或转人工，不能依赖模型记忆编造商城政策。

其他可用订单：

- `ORD-20260717-002`：已签收
- `ORD-20260717-003`：配送异常
- `ORD-20260717-004`：待发货

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `QLORA_BASE_URL` | `http://127.0.0.1:8000/v1` | QLoRA OpenAI 兼容地址 |
| `QLORA_API_KEY` | `local-qlora` | 本地接口未启用鉴权时可为任意非空值 |
| `QLORA_MODEL` | `customer-service-qwen3-8b-qlora` | 提交给兼容接口的模型名 |
| `LOGISTICS_API_URL` | `http://127.0.0.1:3100` | Mock 物流服务地址 |
| `RAG_API_URL` | `http://127.0.0.1:8200` | 文档检索服务地址 |

## 校验

```powershell
pnpm run typecheck
pnpm run build
```

运行数据会写入 `.data/`，构建产物写入 `.mastra/`，两者均已加入 Git 忽略规则。
