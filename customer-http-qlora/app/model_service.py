from __future__ import annotations

import threading
import json
import re
import uuid
from dataclasses import dataclass
from typing import TYPE_CHECKING

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

from .config import Settings
from .schemas import FunctionCall, Message, ToolCall, ToolDefinition, Usage

if TYPE_CHECKING:
    from transformers import PreTrainedModel, PreTrainedTokenizerBase


@dataclass(slots=True)
class GenerationResult:
    text: str
    usage: Usage
    tool_calls: list[ToolCall] | None = None


TOOL_CALL_PATTERN = re.compile(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", re.DOTALL)


def _parse_tool_calls(text: str) -> tuple[str, list[ToolCall] | None]:
    calls: list[ToolCall] = []
    for match in TOOL_CALL_PATTERN.finditer(text):
        try:
            payload = json.loads(match.group(1))
            name = payload["name"]
            arguments = payload.get("arguments", {})
            if not isinstance(arguments, str):
                arguments = json.dumps(arguments, ensure_ascii=False, separators=(",", ":"))
            calls.append(
                ToolCall(
                    id=f"call_{uuid.uuid4().hex}",
                    function=FunctionCall(name=name, arguments=arguments),
                )
            )
        except (KeyError, TypeError, json.JSONDecodeError):
            continue
    clean_text = TOOL_CALL_PATTERN.sub("", text).strip()
    return clean_text, calls or None


class ModelService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.model: PreTrainedModel | None = None
        self.tokenizer: PreTrainedTokenizerBase | None = None
        self.load_error: str | None = None
        self._generation_lock = threading.Lock()

    @property
    def ready(self) -> bool:
        return self.model is not None and self.tokenizer is not None

    def load(self) -> None:
        model_path = self.settings.base_model_path.resolve()
        adapter_path = self.settings.adapter_path.resolve()
        if not model_path.is_dir():
            raise FileNotFoundError(f"基座模型目录不存在：{model_path}")
        if not (adapter_path / "adapter_config.json").is_file():
            raise FileNotFoundError(f"QLoRA Adapter 不完整：{adapter_path}")
        if not torch.cuda.is_available():
            raise RuntimeError("未检测到 CUDA GPU，当前 QLoRA 服务需要 NVIDIA GPU")

        compute_dtype = torch.bfloat16
        quantization_config = None
        if self.settings.load_in_4bit:
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=compute_dtype,
                bnb_4bit_use_double_quant=True,
            )

        tokenizer_path = adapter_path if (adapter_path / "tokenizer.json").is_file() else model_path
        self.tokenizer = AutoTokenizer.from_pretrained(
            tokenizer_path,
            trust_remote_code=True,
        )
        base_model = AutoModelForCausalLM.from_pretrained(
            model_path,
            trust_remote_code=True,
            device_map="auto",
            dtype=compute_dtype,
            quantization_config=quantization_config,
            low_cpu_mem_usage=True,
        )
        self.model = PeftModel.from_pretrained(base_model, adapter_path)
        self.model.eval()
        self.load_error = None

    def generate(
        self,
        messages: list[Message],
        *,
        max_new_tokens: int,
        temperature: float,
        top_p: float,
        repetition_penalty: float,
        tools: list[ToolDefinition] | None = None,
    ) -> GenerationResult:
        if not self.ready or self.model is None or self.tokenizer is None:
            raise RuntimeError(self.load_error or "模型尚未就绪")

        chat = [message.model_dump(exclude_none=True) for message in messages]
        template_options = {
            "tokenize": False,
            "add_generation_prompt": True,
            "enable_thinking": self.settings.enable_thinking,
        }
        if tools:
            template_options["tools"] = [tool.model_dump(exclude_none=True) for tool in tools]
        prompt = self.tokenizer.apply_chat_template(
            chat,
            **template_options,
        )
        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=self.settings.max_input_tokens,
        )
        device = next(self.model.parameters()).device
        inputs = {name: tensor.to(device) for name, tensor in inputs.items()}
        prompt_tokens = int(inputs["input_ids"].shape[-1])
        do_sample = temperature > 0
        generation_kwargs = {
            **inputs,
            "max_new_tokens": max_new_tokens,
            "do_sample": do_sample,
            "repetition_penalty": repetition_penalty,
            "pad_token_id": self.tokenizer.eos_token_id,
        }
        if do_sample:
            generation_kwargs.update(temperature=temperature, top_p=top_p)

        with self._generation_lock, torch.inference_mode():
            output = self.model.generate(**generation_kwargs)
        generated = output[0, prompt_tokens:]
        completion_tokens = int(generated.shape[-1])
        raw_text = self.tokenizer.decode(generated, skip_special_tokens=True).strip()
        text, tool_calls = _parse_tool_calls(raw_text)
        return GenerationResult(
            text=text,
            tool_calls=tool_calls,
            usage=Usage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
            ),
        )
