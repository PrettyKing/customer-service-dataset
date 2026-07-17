# 中文客服 QLoRA 训练

该目录包含 LLaMA-Factory 源码、训练环境、QLoRA 配置、训练脚本与输出。原有数据和文档保持在外层 `win-QLORA/data` 与 `win-QLORA/docs`。

```text
customer-service-qlora/
├─ LLaMA-Factory/       # 官方源码与 editable 安装目录
├─ configs/             # demo、mock、train 配置
├─ scripts/             # 安装、验证和训练脚本
├─ outputs/             # LoRA Adapter 与检查点
└─ .venv/               # 独立 Python 环境
```

## 安装

```powershell
cd G:\customer-service-dataset\win-QLORA\customer-service-qlora
.\scripts\install.ps1
.\scripts\verify.ps1
```

安装流程遵循 LLaMA-Factory 官方方式，在本目录的源码上执行 editable 安装。RTX 5070 使用已验证的 PyTorch 2.8.0+cu128、bitsandbytes 和 sentencepiece 0.2.1。

`LLaMA-Factory/`、`.venv/` 和 `outputs/` 不提交到业务仓库。首次运行安装脚本时，如果本地没有 LLaMA-Factory，脚本会自动从官方仓库浅克隆后执行 editable 安装。

## 训练

```powershell
# 12 条 demo 冒烟训练
.\scripts\train-demo.ps1

# 80 条 mock 扩展训练
.\scripts\train-mock.ps1

# 统一入口
.\scripts\train.ps1 -Dataset train
```

训练结果写入 `outputs/qwen3-8b/`。三份 YAML 直接读取外层 `win-QLORA/data/dataset_info.json`，不会复制或移动原数据。
