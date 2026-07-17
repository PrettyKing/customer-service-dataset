from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class FunctionCall(BaseModel):
    name: str
    arguments: str


class ToolCall(BaseModel):
    id: str
    type: Literal["function"] = "function"
    function: FunctionCall


class FunctionDefinition(BaseModel):
    name: str
    description: str | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)


class ToolDefinition(BaseModel):
    type: Literal["function"] = "function"
    function: FunctionDefinition


class Message(BaseModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str | None = None
    name: str | None = None
    tool_call_id: str | None = None
    tool_calls: list[ToolCall] | None = None

    @model_validator(mode="after")
    def require_content_or_tool_call(self) -> "Message":
        if self.content is None and not (self.role == "assistant" and self.tool_calls):
            raise ValueError("消息需要 content，或 assistant 消息需要 tool_calls")
        if isinstance(self.content, str) and not self.content.strip() and not self.tool_calls:
            raise ValueError("content 不能为空")
        return self


class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1)
    max_new_tokens: int | None = Field(default=None, ge=1, le=2048)
    temperature: float = Field(default=0.7, ge=0, le=2)
    top_p: float = Field(default=0.9, gt=0, le=1)
    repetition_penalty: float = Field(default=1.05, ge=0.1, le=2)

    @model_validator(mode="after")
    def require_user_message(self) -> "ChatRequest":
        if not any(message.role == "user" for message in self.messages):
            raise ValueError("messages 至少需要一条 user 消息")
        return self


class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatResponse(BaseModel):
    reply: str
    usage: Usage


class OpenAIChatRequest(ChatRequest):
    model: str | None = None
    stream: bool = False
    max_tokens: int | None = Field(default=None, ge=1, le=2048)
    max_completion_tokens: int | None = Field(default=None, ge=1, le=2048)
    tools: list[ToolDefinition] | None = None
    tool_choice: str | dict[str, Any] | None = None

    @model_validator(mode="after")
    def use_openai_max_tokens(self) -> "OpenAIChatRequest":
        if self.max_new_tokens is None:
            self.max_new_tokens = self.max_tokens or self.max_completion_tokens
        return self


class OpenAIChoice(BaseModel):
    index: int = 0
    message: Message
    finish_reason: str = "stop"


class OpenAIChatResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[OpenAIChoice]
    usage: Usage
