# Customer Service RAG API

独立的本地知识库服务，负责文档解析、中文 Embedding、Qdrant 摄取、向量检索和 Cross-Encoder Rerank。默认监听 `127.0.0.1:8200`。

## 技术方案

- Embedding：`BAAI/bge-small-zh-v1.5`，FastEmbed/ONNX CPU 推理，512 维
- Vector Store：Qdrant，默认集合 `customer_service_knowledge_v1`
- Reranker：`BAAI/bge-reranker-base`，首次检索时懒加载
- 文档格式：Markdown、TXT、PDF，单文件最大 10MB
- 切分：默认 600 字符，重叠 80 字符

模型使用 CPU，避免与 Qwen3-8B 抢占 RTX 5070 显存。首次摄取会下载 Embedding 模型，首次启用 Rerank 会下载 Reranker 模型。

文档原文、切片和文档元数据都保存在 Qdrant payload 中，当前服务不依赖 MongoDB 或本地业务数据库。

## 安装与启动

```powershell
cd G:\customer-service-dataset\customer-rag-api
Copy-Item .env.example .env
.\scripts\install.ps1
.\scripts\start.ps1
```

Swagger：<http://127.0.0.1:8200/docs>

## 配置

在 `.env` 中配置 Qdrant：

```dotenv
QDRANT_URL=http://127.0.0.1:6333
QDRANT_COLLECTION=customer_service_knowledge_v1
# QDRANT_API_KEY=replace-me
```

不要与其他项目共用集合名。公网 Qdrant 应配置 API Key、防火墙白名单或反向代理鉴权；默认 Qdrant HTTP 服务没有认证。

完整环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` / `PORT` | `127.0.0.1` / `8200` | RAG API 监听地址 |
| `QDRANT_URL` | `http://127.0.0.1:6333` | Qdrant HTTP 地址 |
| `QDRANT_API_KEY` | 空 | Qdrant API Key |
| `QDRANT_COLLECTION` | `customer_service_knowledge_v1` | 独立知识库集合 |
| `EMBEDDING_MODEL` | `BAAI/bge-small-zh-v1.5` | 中文 Embedding 模型 |
| `EMBEDDING_DIMENSION` | `512` | 集合向量维度，修改模型时必须同步调整 |
| `RERANK_ENABLED` | `true` | 是否启用 Cross-Encoder 重排 |
| `RERANK_MODEL` | `BAAI/bge-reranker-base` | Reranker 模型 |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `600` / `80` | 文档切片参数 |
| `SEARCH_CANDIDATES` | `20` | 向量召回候选数量 |
| `CORS_ORIGINS` | 本地前端地址 | 允许访问文档管理 API 的前端来源 |

## API

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/health` | 检查 Qdrant、集合和模型配置 |
| `GET` | `/api/documents` | 获取文档列表 |
| `POST` | `/api/documents` | 上传并摄取文档 |
| `GET` | `/api/documents/{id}` | 获取文档内容 |
| `DELETE` | `/api/documents/{id}` | 删除文档及其全部向量块 |
| `POST` | `/api/search` | 向量召回并按需 Rerank |

搜索示例：

```powershell
$body = @{
  query = "质量问题退货需要什么材料"
  top_k = 4
  rerank = $true
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri http://127.0.0.1:8200/api/search `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body $body
```

上传、查看和删除文档可以直接使用前端“知识库”页面，也可以在 Swagger 中操作。删除文档会同时删除该文档的全部向量切片。

运行测试：

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

`seed/演示商城售后政策.md` 只用于功能演示，不代表真实商城规则。

## 生产注意事项

- 文档管理接口当前没有用户鉴权，不能直接暴露到公网。
- 远程 Qdrant 应开启 API Key，并限制 `6333` 端口来源。
- 修改 Embedding 模型或维度时，应使用新集合重新摄取，不能混用旧向量。
- Reranker 首次请求可能较慢，生产部署可在启动阶段预热模型。
