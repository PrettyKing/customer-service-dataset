# 客服模型微调数据集

这是一个使用 LoRA 微调 Qwen 客服模型的示例项目，包含训练数据、适配器权重和本地部署配置。

## 目录说明

```text
mac/
├── adapters/     # LoRA 微调权重
├── train.jsonl   # 训练数据
├── valid.jsonl   # 验证数据
├── Modelfile     # Ollama 模型配置
└── readme.md     # macOS / MLX-LM 完整训练指南
```

## 模型文件

GGUF 和合并后的完整模型体积较大，不存放在 GitHub 仓库中。最终用于 Ollama 部署的模型文件名为：

```text
qwen-customer-service-q4_K_M.gguf
```

将模型文件放入 `mac/` 目录后，可根据 `mac/Modelfile` 创建 Ollama 模型。

## 数据格式

训练和验证数据使用 JSONL 格式，每行包含一组 `system`、`user` 和 `assistant` 对话消息。

详细的训练、合并、转换及部署步骤请查看 [mac/readme.md](mac/readme.md)。
