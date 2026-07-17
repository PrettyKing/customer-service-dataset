# 栖岸客服工作台

React + Vite + Tailwind CSS 构建的中文客服页面，通过 Mastra Agent 承接本地 QLoRA 模型和物流 Tool。

## 功能

- 多轮客服对话
- Mastra Agent 在线状态检测
- 快捷演示订单查询
- 物流 Tool 结果结构化卡片
- 服务端持久化多轮会话
- 历史会话列表、消息恢复、重命名和删除
- 知识库文档上传、列表、删除和检索测试
- RAG 来源文档标记
- 桌面三栏与移动端单栏响应式布局
- 请求失败提示和重新发送

## 推荐启动方式

```powershell
cd G:\customer-service-dataset
pnpm install
pnpm dev
```

该命令会同时启动前端及其依赖的 QLoRA、RAG、Mock 物流和 Mastra 服务。打开 <http://127.0.0.1:5173>。

## 分别启动

先启动依赖服务：

```powershell
# 终端 1：QLoRA
cd G:\customer-service-dataset\customer-http-qlora
.\scripts\start.ps1

# 终端 2：Mock 物流
cd G:\customer-service-dataset\customer-frontend-logistics-api
pnpm start

# 终端 3：RAG
cd G:\customer-service-dataset\customer-rag-api
.\scripts\start.ps1

# 终端 4：Mastra
cd G:\customer-service-dataset\customer-agents
pnpm run dev
```

然后启动前端：

```powershell
cd G:\customer-service-dataset\customer-frontend
pnpm run dev
```

开发环境由 Vite 将 `/mastra` 代理至 `http://127.0.0.1:4111/api`，将 `/agent-api` 代理至 Mastra 自定义会话接口，将 `/rag` 代理至 `http://127.0.0.1:8200/api`。如需连接其他地址，可修改 `.env`。

浏览器会保存稳定的 resource ID 和当前 thread ID；点击“新建会话”会创建新的 thread。前端每轮只发送当前消息，多轮历史由 Mastra LibSQL 在服务端恢复。桌面端可在左侧历史列表切换、重命名或删除会话，移动端可通过顶部选择器切换。

当前 resource ID 是匿名演示身份。正式上线时应由登录态生成服务端可信的用户 ID，并为会话 API 开启鉴权，不能继续信任浏览器自行提交的 resource ID。

## 前端数据流

| 功能 | 前端地址 | 实际服务 |
| --- | --- | --- |
| Agent 状态和生成回复 | `/mastra` | Mastra 内置 `/api` 路由 |
| 历史会话 CRUD | `/agent-api` | Mastra 自定义 `/customer/conversations` 路由 |
| 文档管理和检索测试 | `/rag` | RAG `/api` 路由 |

发送消息时，前端只提交当前输入和 `{ resource, thread }`，不再把整个聊天记录重复发送。页面刷新后从历史会话详情接口恢复消息，并重新展示持久化的物流卡片和知识来源。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_MASTRA_API_URL` | `/mastra` | Mastra 内置 API 代理 |
| `VITE_MASTRA_CUSTOM_API_URL` | `/agent-api` | Mastra 自定义会话 API 代理 |
| `VITE_MASTRA_AGENT_ID` | `customer-service-agent` | 客服 Agent ID |
| `VITE_RAG_API_URL` | `/rag` | RAG API 代理 |

生产部署时，反向代理需要分别转发 Mastra 的内置 `/api` 路由和不带 `/api` 前缀的自定义会话路由。

## 校验与构建

```powershell
pnpm run typecheck
pnpm run build
```
