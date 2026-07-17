# 中文客服 QLoRA 全栈项目

这是一个可在本地完整运行的中文电商客服示例，覆盖数据集、QLoRA 训练、PyTorch 推理接口、Mastra Agent、物流 Tool、Mock 物流服务和 React 客服工作台。

## 系统架构

```text
React 客服工作台 :5173
          │
          ▼
Mastra 客服 Agent :4111
    ├──────────────► QLoRA API :8000
    │                 └─ Qwen3-8B + LoRA Adapter
    └─ query-logistics Tool
                      └────────► Mock 物流 API :3100
```

## 项目目录

| 目录 | 技术栈 | 用途 |
| --- | --- | --- |
| [`customer-frontend`](customer-frontend/README.md) | React、Vite、Tailwind CSS | 客服对话和物流结果展示 |
| [`customer-agents`](customer-agents/README.md) | Mastra、TypeScript | 客服 Agent 和物流查询 Tool |
| [`customer-frontend-logistics-api`](customer-frontend-logistics-api/README.md) | Node.js、Express | 本地 Mock 物流数据服务 |
| [`customer-http-qlora`](customer-http-qlora/README.md) | FastAPI、PyTorch、PEFT | QLoRA 推理及 OpenAI 兼容接口 |
| [`customer-service-qlora`](customer-service-qlora/README.md) | LLaMA-Factory、MLX-LM | Windows/macOS 模型训练资产 |

## 环境要求

- Windows 训练和全栈联调：Node.js 22、pnpm 10、PowerShell 7、Python 3.11。
- QLoRA 推理：支持 CUDA 的 NVIDIA GPU；当前环境已验证 RTX 5070、PyTorch 2.8.0+cu128 和 bitsandbytes 0.49.2。
- 本地基座模型：`customer-service-qlora/win/models/Qwen3-8B`。
- 默认 Adapter：`customer-service-qlora/win/outputs/qwen3-8b/customer-service-demo-qlora`。

模型、虚拟环境、训练输出、Node 依赖、`.env` 和运行日志均由 `.gitignore` 排除。克隆代码后，需要自行准备基座模型和 Adapter。

## 一键启动

首次安装 Node.js workspace 依赖：

```powershell
cd G:\customer-service-dataset
pnpm install
```

如尚未准备 Windows QLoRA 环境，先执行：

```powershell
cd G:\customer-service-dataset\customer-service-qlora\win
.\scripts\install.ps1
.\scripts\verify.ps1
```

回到仓库根目录，一条命令启动四项服务：

```powershell
cd G:\customer-service-dataset
pnpm dev
```

| 服务 | 地址 |
| --- | --- |
| 客服工作台 | <http://127.0.0.1:5173> |
| Mastra Studio | <http://127.0.0.1:4111> |
| Mock 物流 API | <http://127.0.0.1:3100> |
| QLoRA Swagger | <http://127.0.0.1:8000/docs> |

首次启动 Qwen3-8B 需要加载本地权重，服务通常会比其他三个项目晚就绪。在启动终端按 `Ctrl+C` 可停止整套服务。

## 常用命令

```powershell
# 分别启动
pnpm dev:frontend
pnpm dev:agents
pnpm dev:logistics
pnpm dev:qlora

# Node.js workspace 校验
pnpm typecheck
pnpm test
pnpm build

# QLoRA API 校验
cd customer-http-qlora
.\scripts\verify.ps1
```

## 环境配置

各服务都提供 `.env.example`，默认地址适用于本仓库的一键启动，无需创建 `.env` 也能运行。需要修改端口、API Key 或模型位置时，再复制对应模板：

```powershell
Copy-Item customer-http-qlora\.env.example customer-http-qlora\.env
Copy-Item customer-agents\.env.example customer-agents\.env
Copy-Item customer-frontend-logistics-api\.env.example customer-frontend-logistics-api\.env
Copy-Item customer-frontend\.env.example customer-frontend\.env
```

`.env` 仅用于本机配置，不要提交密钥或内部地址。

## 演示订单

启动完整服务后，可在客服工作台中查询：

| 订单号 | Mock 状态 |
| --- | --- |
| `ORD-20260717-001` | 顺丰运输中 |
| `ORD-20260717-002` | 圆通已签收 |
| `ORD-20260717-003` | 京东配送异常 |
| `ORD-20260717-004` | 待发货 |

示例问题：

```text
帮我查一下订单 ORD-20260717-001 到哪里了？
```

Mastra Agent 会先调用 `query-logistics` Tool，再使用本地 QLoRA 模型整理最终客服回复。

## 模型训练

- Windows QLoRA 训练：[customer-service-qlora/win/README.md](customer-service-qlora/win/README.md)
- Windows 数据说明：[customer-service-qlora/win/data/README.md](customer-service-qlora/win/data/README.md)
- macOS MLX-LM 训练：[customer-service-qlora/mac/docs/readme.md](customer-service-qlora/mac/docs/readme.md)
- macOS 重新训练流程：[customer-service-qlora/mac/docs/retrain-workflow.md](customer-service-qlora/mac/docs/retrain-workflow.md)
