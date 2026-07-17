from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.model_service import GenerationResult
from app.model_service import _parse_tool_calls
from app.schemas import Usage


class FakeModelService:
    ready = True
    load_error = None

    def generate(self, messages, **kwargs):
        assert messages[-1].content == "我的订单什么时候发货？"
        return GenerationResult(
            text="您好，请提供订单号，我马上为您查询。",
            usage=Usage(prompt_tokens=12, completion_tokens=10, total_tokens=22),
        )


def make_settings(api_key=None):
    return Settings(
        app_name="test",
        host="127.0.0.1",
        port=8000,
        base_model_path=Path("model"),
        adapter_path=Path("adapter"),
        load_in_4bit=True,
        enable_thinking=False,
        max_input_tokens=512,
        default_max_new_tokens=64,
        api_key=api_key,
        cors_origins=("*",),
    )


def test_chat_and_openai_compatible_endpoint():
    app = create_app(make_settings(), FakeModelService())
    body = {"messages": [{"role": "user", "content": "我的订单什么时候发货？"}]}
    with TestClient(app) as client:
        response = client.post("/api/chat", json=body)
        assert response.status_code == 200
        assert response.json()["reply"].startswith("您好")

        response = client.post("/v1/chat/completions", json=body)
        assert response.status_code == 200
        assert response.json()["object"] == "chat.completion"
        assert response.json()["usage"]["total_tokens"] == 22


def test_api_key_and_validation():
    app = create_app(make_settings("secret"), FakeModelService())
    body = {"messages": [{"role": "user", "content": "我的订单什么时候发货？"}]}
    with TestClient(app) as client:
        assert client.post("/api/chat", json=body).status_code == 401
        assert client.post(
            "/api/chat",
            json=body,
            headers={"Authorization": "Bearer secret"},
        ).status_code == 200
        assert client.post(
            "/api/chat",
            json={"messages": [{"role": "assistant", "content": "您好"}]},
            headers={"Authorization": "Bearer secret"},
        ).status_code == 422


def test_parse_qwen_tool_call():
    text, calls = _parse_tool_calls(
        '<tool_call>\n{"name":"query-logistics","arguments":{"orderId":"ORD-20260717-001"}}\n</tool_call>'
    )
    assert text == ""
    assert calls is not None
    assert calls[0].function.name == "query-logistics"
    assert '"orderId":"ORD-20260717-001"' in calls[0].function.arguments
