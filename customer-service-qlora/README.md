# 中文客服模型训练

该目录统一管理 Windows 与 macOS 两套客服模型训练方案；推理 API、Agent、Mock 服务和前端位于仓库根目录相邻的 `customer-*` 项目中。

```text
customer-service-qlora/
├─ win/    # Windows、LLaMA-Factory、Qwen3-8B、4-bit QLoRA
└─ mac/    # macOS、MLX-LM、LoRA、GGUF 与 Ollama
```

## Windows

Windows 目录包含基座模型、中文训练数据、LLaMA-Factory、独立 Python 环境、QLoRA 配置和 Adapter 输出。

```powershell
cd G:\customer-service-dataset\customer-service-qlora\win
.\scripts\verify.ps1
.\scripts\train-demo.ps1
```

详细说明：[win/README.md](win/README.md)

## macOS

macOS 目录包含 MLX-LM 数据、Adapter、模型合并/量化说明和 Ollama 配置。

详细说明：[mac/docs/readme.md](mac/docs/readme.md)
