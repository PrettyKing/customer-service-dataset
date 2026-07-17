# Mastra 中文客服 Agent

使用 Mastra 构建的中文客服 Agent：

- 模型：本地 Qwen3-8B QLoRA OpenAI 兼容接口
- Tool：Mock 物流查询服务
- Studio/API：Mastra 本地开发服务器

## 服务依赖

启动顺序：

1. `customer-http-qlora`，默认 `http://127.0.0.1:8000`
2. `customer-frontend-logistics-api`，默认 `http://127.0.0.1:3100`
3. 当前 Mastra 项目，默认 `http://localhost:4111`

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

浏览器打开 <http://127.0.0.1:4111>，选择“中文电商客服 Agent”。

Mastra API 地址为 `http://127.0.0.1:4111/api`，Agent ID 为 `customer-service-agent`。

```powershell
$body = @{
  messages = "帮我查一下订单 ORD-20260717-001 到哪里了？"
  maxSteps = 5
} | ConvertTo-Json

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

## 校验

```powershell
pnpm run typecheck
pnpm run build
```
