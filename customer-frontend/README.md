# 栖岸客服工作台

React + Vite + Tailwind CSS 构建的中文客服页面，通过 Mastra Agent 承接本地 QLoRA 模型和物流 Tool。

## 功能

- 多轮客服对话
- Mastra Agent 在线状态检测
- 快捷演示订单查询
- 物流 Tool 结果结构化卡片
- 桌面三栏与移动端单栏响应式布局
- 请求失败提示和重新发送

## 推荐启动方式

```powershell
cd G:\customer-service-dataset
pnpm install
pnpm dev
```

该命令会同时启动前端及其依赖的 QLoRA、Mock 物流和 Mastra 服务。打开 <http://127.0.0.1:5173>。

## 分别启动

先启动依赖服务：

```powershell
# 终端 1：QLoRA
cd G:\customer-service-dataset\customer-http-qlora
.\scripts\start.ps1

# 终端 2：Mock 物流
cd G:\customer-service-dataset\customer-frontend-logistics-api
pnpm start

# 终端 3：Mastra
cd G:\customer-service-dataset\customer-agents
pnpm run dev
```

然后启动前端：

```powershell
cd G:\customer-service-dataset\customer-frontend
pnpm run dev
```

开发环境由 Vite 将 `/mastra` 代理至 `http://127.0.0.1:4111/api`。如需连接其他地址，可修改 `.env` 中的 `VITE_MASTRA_API_URL`。

## 校验与构建

```powershell
pnpm run typecheck
pnpm run build
```
