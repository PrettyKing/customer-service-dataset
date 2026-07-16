# Mac(M5 Max)上用 MLX-LM 微调 Qwen 客服模型完整指南

适用场景:通用对话/客服答疑(风格统一 + 知识内化)
推荐模型:Qwen2.5-14B-Instruct
你的硬件:M5 Max + 48GB 统一内存 —— 跑14B模型的LoRA训练完全没有压力

---

## 一、安装环境

```bash
pip3 install mlx-lm
```

验证安装:
```bash
python3 -c "import mlx_lm; print(mlx_lm.__version__)"
```

不需要额外装CUDA相关组件,MLX是苹果官方为Apple Silicon设计的框架,直接利用统一内存架构。

---

## 二、模型选择说明

推荐从 HuggingFace 的 `mlx-community` 组织下载预转换好的模型:

```
mlx-community/Qwen2.5-14B-Instruct-4bit
```

这是社区预先转换并量化好的版本,不需要你自己做格式转换,`mlx_lm` 会在第一次运行时自动下载。

**如果后续想尝试更小规模、迭代更快**:可以换成 `mlx-community/Qwen3-8B-4bit`,官方数据显示Qwen3-8B训练数据规模和后训练流程升级后,表现已经接近上一代14B模型,适合快速实验阶段用。

---

## 三、准备客服场景训练数据

客服场景的核心是**风格统一 + 多轮对话能力**,数据格式要用完整的对话结构,而不是单轮问答。

创建文件夹 `customer-service-dataset/`,包含 `train.jsonl` 和 `valid.jsonl` 两个文件。

### 数据格式示例(train.jsonl,每行一条JSON)

```json
{"messages": [{"role": "system", "content": "你是XX公司的客服助手,说话礼貌耐心,遇到问题先安抚用户情绪再给出解决方案,回复简洁不啰嗦"}, {"role": "user", "content": "我的订单怎么还没发货"}, {"role": "assistant", "content": "非常抱歉给您带来不便,我这边帮您查一下订单状态。请问能提供一下订单编号吗?"}, {"role": "user", "content": "订单号是123456"}, {"role": "assistant", "content": "已经帮您查到了,订单目前正在仓库打包中,预计明天会安排发货,还请您稍等一下~"}]}
{"messages": [{"role": "system", "content": "你是XX公司的客服助手,说话礼貌耐心,遇到问题先安抚用户情绪再给出解决方案,回复简洁不啰嗦"}, {"role": "user", "content": "这个东西怎么这么差,我要退货!"}, {"role": "assistant", "content": "非常理解您的心情,给您带来不好的体验我们深感抱歉。请问方便告诉我具体是哪里不满意吗?我这边马上帮您安排退货流程。"}]}
```

### 数据准备建议

| 维度 | 建议 |
|---|---|
| 数据量 | 300-800条高质量多轮对话起步 |
| 覆盖范围 | 常见问题类型(物流/退换货/账户/支付等)、不同情绪状态(正常咨询/抱怨/催促) |
| system字段 | 建议固定统一的人设描述,写清楚语气和应对原则,让模型稳定学到这个"角色设定" |
| 验证集 | 从数据中留出15-20%放入valid.jsonl,不参与训练,只用来评估效果 |

**关于"风格"和"知识"要分开考虑**:
- 语气、应对模板、话术这类"软性风格"适合放进微调数据
- 会频繁变化的信息(比如实时库存、临时促销)不建议死记硬背进模型,更适合结合检索(RAG)在对话时动态提供,否则政策一变旧知识就成了错误信息

---

## 四、开始训练

```bash
mlx_lm.lora \
    --model mlx-community/Qwen2.5-14B-Instruct-4bit \
    --train \
    --data ./customer-service-dataset \
    --iters 800 \
    --batch-size 2 \
    --num-layers 24
```

### 参数说明(相比之前分类任务的调整)

- `--iters 800`:客服风格类任务比固定格式分类更"软性",数据量通常也更大,建议提高到800次左右,给模型更充分的学习空间
- `--num-layers 24`:风格迁移需要更多层参与学习,不只是学会某个具体格式,所以从默认的16调高到24(如果内存/速度允许,还可以尝试32,你的48GB内存有余量)
- `--batch-size 2`:内存充裕情况下可以保持2,如果训练中出现内存压力可以调回1

### 训练过程观察

```
Iter 10: Train loss 2.1xx, It/sec 0.6x, Tokens/sec 2xx
Iter 200: Train loss 1.2xx, ...
Iter 800: Train loss 0.4xx, ...
```

客服风格类任务的loss下降通常比纯分类任务更平缓一些(因为语言表达的多样性更大),只要持续下降、没有剧烈震荡就是正常的。

---

## 五、测试微调效果

用几个典型客服场景对比测试:

```bash
mlx_lm.generate \
    --model mlx-community/Qwen2.5-14B-Instruct-4bit \
    --adapter-path ./adapters \
    --prompt "用户很生气地说东西坏了要退款,你怎么回复" \
    --max-tokens 150
```

**重点观察**:
1. 语气是否符合你训练数据里设定的"人设"(礼貌、先共情再解决)
2. 是否不再需要在prompt里反复强调"请礼貌回复""请先安抚情绪"这些规则(这是微调省token的核心验证点)
3. 面对训练数据里没出现过的新问题,是否也能保持一致的风格(泛化能力)

对比一下**不加 `--adapter-path`** 的原始模型输出,能直观看出微调前后的风格差异。

---

## 六、合并权重(用于稳定部署)

```bash
mlx_lm.fuse \
    --model mlx-community/Qwen2.5-14B-Instruct-4bit \
    --adapter-path ./adapters \
    --save-path ./qwen-customer-service-merged
```

合并后得到一个完整的、不需要额外加载adapter的模型,可以直接用于稳定的日常调用。

---

## 七、导入 Ollama 使用(可选)

如果希望通过Ollama对话形式使用:

```bash
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp
pip3 install -r requirements.txt

python3 convert_hf_to_gguf.py ../qwen-customer-service-merged \
    --outfile qwen-customer-service.gguf \
    --outtype q8_0
```

创建 Modelfile:
```
FROM ./qwen-customer-service.gguf

SYSTEM """你是XX公司的客服助手,说话礼貌耐心,遇到问题先安抚用户情绪再给出解决方案,回复简洁不啰嗦"""

PARAMETER temperature 0.7
```

导入并使用:
```bash
ollama create qwen-customer-service -f Modelfile
ollama run qwen-customer-service
```

把 `SYSTEM` 字段直接写进Modelfile里,这样每次对话不用重复输入人设,也是省token的一部分。

---

## 八、效果验证清单(客服场景专项)

1. **风格一致性测试**:准备10-15个训练数据里没出现过的新问题,检查模型是否依然保持统一语气
2. **情绪应对测试**:专门测试几个"用户很生气/很着急"的场景,检查安抚话术是否自然,不生硬
3. **知识准确性测试**:如果训练数据里包含具体政策信息,验证模型回答是否准确,没有编造(幻觉)
4. **token消耗对比**:记录"原模型+长prompt人设描述" vs "微调模型+精简prompt"的实际token消耗差异
5. **过拟合检查**:如果发现模型对训练数据里的原话"死记硬背"、面对稍微改写的问题就答不好,说明数据量可能不够或迭代次数(iters)过多,需要调整

---

## 常见问题

**Q: 训练完发现模型"油腔滑调"或过于机械重复某些话术?**
A: 大概率是训练数据里某些应答模板出现频率过高、缺乏多样性。建议增加同类场景下不同表达方式的样本,避免模型死记硬背某几句话。

**Q: 想让模型同时具备多个产品线的客服知识,应该分别训练还是一起训练?**
A: 如果产品线之间风格一致、只是知识不同,建议放在同一批数据里一起训练,并在system prompt里注明产品线信息;如果风格差异很大(比如面向企业客户 vs 面向个人用户),可以考虑训练成两个独立的adapter,按场景切换加载。

**Q: 14B模型训练一轮大概要多久?**
A: 具体取决于数据量和iters设置,作为参考,8B模型在类似配置下大概是几个token/秒的训练速度量级,14B会更慢一些,800 iters的完整训练通常在1-3小时量级(实际视你的具体数据长度和批次大小而定),建议先跑100-200 iters观察loss趋势是否正常,再决定是否跑完整训练。