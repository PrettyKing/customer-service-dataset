# Windows QLoRA 目录说明

该目录集中保存 Windows 上的模型、客服数据、训练配置、LLaMA-Factory 环境和训练输出。

```text
customer-service-qlora/win/
├─ models/                    # 本地基座模型，不提交到 Git
│  └─ Qwen3-8B/
├─ data/                      # 中文客服训练数据和 dataset_info.json
├─ docs/                      # 客服智能体设计文档
├─ configs/                  # QLoRA 配置
├─ scripts/                  # 安装、验证与训练脚本
├─ LLaMA-Factory/            # 官方训练框架源码
└─ outputs/                  # Adapter 与训练输出
```

快速验证：

```powershell
cd G:\customer-service-dataset\customer-service-qlora\win
.\scripts\verify.ps1
.\scripts\train-demo.ps1
```

扩展训练：

```powershell
.\scripts\train-mock.ps1
```

详细安装与训练说明请查看 [../README.md](../README.md)。
