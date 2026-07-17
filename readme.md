# 客服模型微调数据集

这是一个使用 MLX-LM 对 Qwen 进行 LoRA/QLoRA 风格微调的电商客服模型项目，包含训练数据、适配器权重、合并模型目录说明和 Ollama 本地部署配置。

当前基础模型：

```text
mlx-community/Qwen2.5-14B-Instruct-4bit
```

当前数据规模：

```text
mac/data/train.jsonl  # 54 条训练样本
mac/data/valid.jsonl  # 11 条验证样本
```

## 目录说明

```text
mac/
├── data/         # 训练集和验证集
├── docs/         # macOS / MLX-LM 完整训练指南
├── llama.cpp/    # 本地 GGUF 转换和量化工具,不提交到 Git
├── models/       # MLX 合并模型和 GGUF 模型
├── ollama/       # Ollama Modelfile
└── training/     # LoRA 微调权重
```

## 关键文件说明

```text
mac/data/train.jsonl
mac/data/valid.jsonl
```

电商客服多轮对话数据，覆盖物流、退换货、退款、优惠券、支付、发票、会员、积分、预售、缺货、售后、投诉、账号风控等场景。

```text
mac/training/adapters/
```

训练得到的 LoRA adapter 权重，不是完整模型。用 MLX 推理时可以和基础模型一起加载。

```text
mac/models/
```

训练完成后的完整模型和转换产物。该目录包含大文件，已在 `.gitignore` 中忽略，不建议提交到 Git。

```text
mac/llama.cpp/
```

本地放置的 `llama.cpp` 工具仓库,用于把 f16 合并模型转换为 GGUF 并量化。该目录是第三方工具和编译产物,已在 `.gitignore` 中忽略。

```text
mac/ollama/Modelfile
```

Ollama 导入配置，当前指向 `mac/models/gguf/qwen-customer-service-q4_K_M.gguf`。

## 模型文件

GGUF 和合并后的完整模型体积较大，不存放在 GitHub 仓库中。最终用于 Ollama 部署的模型文件名为：

```text
qwen-customer-service-q4_K_M.gguf
```

当前 Ollama 使用的 GGUF 文件路径为：

```text
mac/models/gguf/qwen-customer-service-q4_K_M.gguf
```

使用以下命令创建 Ollama 模型：

```bash
ollama create qwen-customer-service -f mac/ollama/Modelfile
```

运行模型：

```bash
ollama run qwen-customer-service
```

本地 API 地址：

```text
http://localhost:11434
```

## 数据格式

训练和验证数据使用 JSONL 格式，每行包含一组 `system`、`user` 和 `assistant` 对话消息。

详细的训练、合并、转换及部署步骤请查看 [mac/docs/readme.md](mac/docs/readme.md)。

每次更新数据后的重新训练流程请查看 [mac/docs/retrain-workflow.md](mac/docs/retrain-workflow.md)。
