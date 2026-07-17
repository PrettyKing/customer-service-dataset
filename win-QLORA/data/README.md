# 中文客服 QLoRA 数据

该目录只保存中文客服训练数据及其生成、注册信息。训练环境、LLaMA-Factory 配置和训练脚本位于相邻的 `customer-service-qlora` 目录。

## 文件

- `customer_service_demo.json`：12 条快速验证样本。
- `customer_service_mock.json`：80 条扩展场景样本。
- `customer_service_train.json`：41 条人工设计的起步样本。
- `dataset_info.json`：供 LLaMA-Factory 读取的数据集注册文件。
- `generate_customer_service_datasets.py`：重新生成 demo 和 mock 的脚本。

数据采用 Alpaca 四字段格式：`instruction`、`input`、`output`、`system`。

## 生成和训练

从训练目录运行：

```powershell
cd G:\customer-service-dataset\win-QLORA\customer-service-qlora
.\scripts\regenerate-data.ps1
.\scripts\verify.ps1
.\scripts\train-demo.ps1
```

demo 和 mock 是合成验证数据，不能直接作为线上客服的正式训练集。正式训练前需要补充经过脱敏、审核和固定测试集验证的真实业务样本。
