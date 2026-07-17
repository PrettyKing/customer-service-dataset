# Customer Service QLoRA API

使用 FastAPI、PyTorch、Transformers、bitsandbytes 和 PEFT 封装中文客服 QLoRA 模型。默认加载本仓库已经训练好的 Qwen3-8B Demo Adapter，并以 4-bit NF4 模式运行。

## 默认模型位置

```text
基座模型：../customer-service-qlora/win/models/Qwen3-8B
Adapter： ../customer-service-qlora/win/outputs/qwen3-8b/customer-service-demo-qlora
```

模型和 Adapter 不复制到本项目，避免重复占用磁盘。路径可以在 `.env` 中修改。

## 安装与启动

完整联调推荐在仓库根目录执行 `pnpm dev`，该命令会同时启动 QLoRA API、Mock 物流、Mastra 和 React 前端。以下命令用于单独准备或启动 QLoRA API：

```powershell
cd G:\customer-service-dataset\customer-http-qlora
Copy-Item .env.example .env
.\scripts\install.ps1
.\scripts\verify.ps1
.\scripts\start.ps1
```

启动脚本优先使用本项目的 `.venv`。如果尚未执行安装，但仓库中的 Windows QLoRA 训练环境可用，则会临时复用该环境。

首次启动需要加载约 8B 参数的基座模型，等待时间取决于磁盘速度。服务启动后打开：

- Swagger：<http://127.0.0.1:8000/docs>
- 健康检查：<http://127.0.0.1:8000/health>
- 就绪检查：<http://127.0.0.1:8000/ready>

## 客服对话接口

```powershell
$body = @{
    messages = @(
        @{ role = "system"; content = "你是一名专业的电商客服。" }
        @{ role = "user"; content = "我的订单什么时候发货？" }
    )
    temperature = 0.7
    max_new_tokens = 256
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
    -Uri http://127.0.0.1:8000/api/chat `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

返回示例：

```json
{
  "reply": "您好，请提供订单号，我马上为您查询。",
  "usage": {
    "prompt_tokens": 28,
    "completion_tokens": 13,
    "total_tokens": 41
  }
}
```

## OpenAI 兼容接口

接口地址为 `POST /v1/chat/completions`，请求支持 `messages`、`temperature`、`top_p`、OpenAI 风格的 `max_tokens`，也兼容 `max_new_tokens`。接口支持 `tools`、`tool_choice`、`tool_calls` 和 `tool` 消息，可供 Mastra 等 Agent 框架执行本地工具。当前版本仅支持非流式调用，`stream=true` 会返回 400。

## API Key

默认不启用鉴权。生产环境建议在 `.env` 中配置：

```dotenv
API_KEY=replace-with-a-secret
```

请求时增加：

```text
Authorization: Bearer replace-with-a-secret
```

## 切换 Adapter

完成 mock 或完整数据训练后，只需要修改 `.env`：

```dotenv
ADAPTER_PATH=G:\customer-service-dataset\customer-service-qlora\win\outputs\qwen3-8b\customer-service-qlora
```

然后重启服务。单进程会串行执行 GPU 生成任务，避免多个请求同时生成导致显存溢出。
