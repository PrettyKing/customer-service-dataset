# 重新训练与部署流程

这份文档用于每次更新 `customer-service-qlora/mac/data/` 里的客服数据后,重新训练 LoRA adapter,测试效果,并生成新的 Ollama 模型。

当前基础模型:

```text
mlx-community/Qwen2.5-14B-Instruct-4bit
```

当前项目目录:

```text
/Users/chalee/Desktop/customer-service-dataset
```

## 一、确认数据

训练数据:

```text
customer-service-qlora/mac/data/train.jsonl
customer-service-qlora/mac/data/valid.jsonl
```

查看数据条数:

```bash
cd /Users/chalee/Desktop/customer-service-dataset
wc -l customer-service-qlora/mac/data/train.jsonl customer-service-qlora/mac/data/valid.jsonl
```

校验 JSONL 格式:

```bash
python -c 'import json, pathlib
for p in ["customer-service-qlora/mac/data/train.jsonl", "customer-service-qlora/mac/data/valid.jsonl"]:
    for i, line in enumerate(pathlib.Path(p).read_text().splitlines(), 1):
        json.loads(line)
print("jsonl ok")'
```

## 二、重新训练 Adapter

建议每次训练新版本时使用新的 adapter 目录,不要直接覆盖旧版本。

示例:训练 `adapters-v2`

```bash
cd /Users/chalee/Desktop/customer-service-dataset

mlx_lm.lora \
  --model mlx-community/Qwen2.5-14B-Instruct-4bit \
  --train \
  --data ./customer-service-qlora/mac/data \
  --adapter-path ./customer-service-qlora/mac/training/adapters-v2 \
  --iters 300 \
  --batch-size 1 \
  --num-layers 16
```

参数建议:

```text
--iters 300       当前数据量较小时先用300,避免过拟合
--batch-size 1    14B模型在 Mac 上更稳
--num-layers 16   和当前已有 adapter 配置一致
```

如果后续数据扩充到300条以上,可以尝试:

```text
--iters 800
--num-layers 24
```

## 三、测试 Adapter 效果

训练完成后先不要急着合并模型,先直接加载 adapter 测试。

```bash
mlx_lm.generate \
  --model mlx-community/Qwen2.5-14B-Instruct-4bit \
  --adapter-path ./customer-service-qlora/mac/training/adapters-v2 \
  --prompt "客户说商品少发了一件,很生气,请你作为客服回复。" \
  --max-tokens 200
```

建议测试这些场景:

```text
客户说商品坏了要退款
客户说订单三天没发货
客户说少发一件
客户说优惠券用不了
客户要求投诉并转人工
客户问发票开错了怎么处理
```

重点观察:

```text
是否先安抚情绪
是否主动索要订单号/售后单号等关键信息
是否给出清晰下一步
是否避免编造具体政策
是否回复简洁,不像模板堆砌
```

## 四、合并成 MLX 模型

如果 adapter 效果满意,先合并一份 MLX 4bit 模型:

```bash
cd /Users/chalee/Desktop/customer-service-dataset

mlx_lm.fuse \
  --model mlx-community/Qwen2.5-14B-Instruct-4bit \
  --adapter-path ./customer-service-qlora/mac/training/adapters-v2 \
  --save-path ./customer-service-qlora/mac/models/mlx-4bit/qwen-customer-service-merged-v2
```

这份模型可以直接用 MLX 推理:

```bash
mlx_lm.generate \
  --model ./customer-service-qlora/mac/models/mlx-4bit/qwen-customer-service-merged-v2 \
  --prompt "客户说商品坏了要退款,请你回复。" \
  --max-tokens 200
```

## 五、导出 f16 模型给 GGUF 转换使用

Ollama 不能直接使用 MLX 4bit 合并目录。需要额外导出一份反量化后的 f16 模型:

```bash
cd /Users/chalee/Desktop/customer-service-dataset

mlx_lm.fuse \
  --model mlx-community/Qwen2.5-14B-Instruct-4bit \
  --adapter-path ./customer-service-qlora/mac/training/adapters-v2 \
  --save-path ./customer-service-qlora/mac/models/mlx-f16/qwen-customer-service-merged-f16-v2 \
  --dequantize
```

## 六、转换成 GGUF

进入项目内的 `llama.cpp`:

```bash
cd /Users/chalee/Desktop/customer-service-dataset/customer-service-qlora/mac/llama.cpp
```

如果是第一次使用,先确保依赖和编译工具可用:

```bash
pip3 install -r requirements.txt
cmake -B build
cmake --build build --config Release -j
```

转换 f16 GGUF:

```bash
python convert_hf_to_gguf.py \
  /Users/chalee/Desktop/customer-service-dataset/customer-service-qlora/mac/models/mlx-f16/qwen-customer-service-merged-f16-v2 \
  --outfile /Users/chalee/Desktop/customer-service-dataset/customer-service-qlora/mac/models/gguf/qwen-customer-service-f16-v2.gguf \
  --outtype f16
```

量化成 Q4_K_M:

```bash
./build/bin/llama-quantize \
  /Users/chalee/Desktop/customer-service-dataset/customer-service-qlora/mac/models/gguf/qwen-customer-service-f16-v2.gguf \
  /Users/chalee/Desktop/customer-service-dataset/customer-service-qlora/mac/models/gguf/qwen-customer-service-q4_K_M-v2.gguf \
  Q4_K_M
```

说明:

```text
qwen-customer-service-f16-v2.gguf      中间文件,体积很大
qwen-customer-service-q4_K_M-v2.gguf   Ollama 日常使用文件
```

确认 Ollama 模型可用后,可以删除 f16 中间文件节省空间。

## 七、创建 Ollama 模型

复制一份新的 Modelfile,避免覆盖旧版本:

```bash
cd /Users/chalee/Desktop/customer-service-dataset
cp customer-service-qlora/mac/ollama/Modelfile customer-service-qlora/mac/ollama/Modelfile-v2
```

把 `customer-service-qlora/mac/ollama/Modelfile-v2` 里的 `FROM` 改成:

```text
FROM /Users/chalee/Desktop/customer-service-dataset/customer-service-qlora/mac/models/gguf/qwen-customer-service-q4_K_M-v2.gguf
```

导入 Ollama:

```bash
ollama create qwen-customer-service-v2 -f customer-service-qlora/mac/ollama/Modelfile-v2
```

运行测试:

```bash
ollama run qwen-customer-service-v2
```

测试问题:

```text
客户很生气,说商品少发了一件,要求马上退款,你怎么回复?
```

## 八、本地 API 调用

Ollama 默认 API:

```text
http://localhost:11434
```

OpenAI 兼容接口:

```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-customer-service-v2",
    "messages": [
      {"role": "user", "content": "客户说订单三天没发货,很生气,请你回复。"}
    ]
  }'
```

Ollama 原生接口:

```bash
curl http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-customer-service-v2",
    "messages": [
      {"role": "user", "content": "客户说商品坏了要退款,请你回复。"}
    ],
    "stream": false
  }'
```

## 九、版本命名建议

每次重新训练建议按版本号保存:

```text
customer-service-qlora/mac/training/adapters-v2
customer-service-qlora/mac/models/mlx-4bit/qwen-customer-service-merged-v2
customer-service-qlora/mac/models/mlx-f16/qwen-customer-service-merged-f16-v2
customer-service-qlora/mac/models/gguf/qwen-customer-service-q4_K_M-v2.gguf
customer-service-qlora/mac/ollama/Modelfile-v2
ollama model: qwen-customer-service-v2
```

下一次训练可以使用:

```text
v3, v4, v5 ...
```

这样方便对比不同数据和参数训练出的效果。

## 十、常见清理

查看 Ollama 中已有模型:

```bash
ollama list
```

删除旧 Ollama 模型:

```bash
ollama rm qwen-customer-service-v1
```

停止正在占用内存的模型:

```bash
ollama stop qwen-customer-service-v2
```

确认当前正在运行的模型:

```bash
ollama ps
```
