from __future__ import annotations

import asyncio
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .model_service import ModelService
from .schemas import (
    ChatRequest,
    ChatResponse,
    Message,
    OpenAIChatRequest,
    OpenAIChatResponse,
    OpenAIChoice,
)


def create_app(
    settings: Settings | None = None,
    model_service: ModelService | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        service = model_service or ModelService(settings)
        app.state.model_service = service
        if not service.ready:
            try:
                await asyncio.to_thread(service.load)
            except Exception as exc:
                service.load_error = str(exc)
                raise
        yield

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="基于 PyTorch、Transformers 和 PEFT 的中文客服 QLoRA 推理接口",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=settings.cors_origins != ("*",),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def authorize(authorization: str | None = Header(default=None)) -> None:
        if not settings.api_key:
            return
        if authorization != f"Bearer {settings.api_key}":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的 API Key")

    def get_service(request: Request) -> ModelService:
        return request.app.state.model_service

    async def run_generation(request_body: ChatRequest, service: ModelService):
        if not service.ready:
            raise HTTPException(status_code=503, detail=service.load_error or "模型尚未就绪")
        try:
            return await asyncio.to_thread(
                service.generate,
                request_body.messages,
                max_new_tokens=request_body.max_new_tokens or settings.default_max_new_tokens,
                temperature=request_body.temperature,
                top_p=request_body.top_p,
                repetition_penalty=request_body.repetition_penalty,
                tools=getattr(request_body, "tools", None),
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready", tags=["system"])
    def ready(service: ModelService = Depends(get_service)) -> dict[str, object]:
        if not service.ready:
            raise HTTPException(status_code=503, detail=service.load_error or "模型尚未就绪")
        return {
            "status": "ready",
            "base_model": str(settings.base_model_path),
            "adapter": str(settings.adapter_path),
            "quantization": "4-bit NF4" if settings.load_in_4bit else "disabled",
        }

    @app.post("/api/chat", response_model=ChatResponse, dependencies=[Depends(authorize)], tags=["chat"])
    async def chat(
        body: ChatRequest,
        service: ModelService = Depends(get_service),
    ) -> ChatResponse:
        result = await run_generation(body, service)
        return ChatResponse(reply=result.text, usage=result.usage)

    @app.post(
        "/v1/chat/completions",
        response_model=OpenAIChatResponse,
        dependencies=[Depends(authorize)],
        tags=["openai-compatible"],
    )
    async def openai_chat(
        body: OpenAIChatRequest,
        service: ModelService = Depends(get_service),
    ) -> OpenAIChatResponse:
        if body.stream:
            raise HTTPException(status_code=400, detail="当前版本暂不支持 stream=true")
        result = await run_generation(body, service)
        model_name = body.model or "customer-service-qwen3-8b-qlora"
        assistant_message = Message(
            role="assistant",
            content=result.text or None,
            tool_calls=result.tool_calls,
        )
        return OpenAIChatResponse(
            id=f"chatcmpl-{uuid.uuid4().hex}",
            created=int(time.time()),
            model=model_name,
            choices=[OpenAIChoice(
                message=assistant_message,
                finish_reason="tool_calls" if result.tool_calls else "stop",
            )],
            usage=result.usage,
        )

    return app


app = create_app()
