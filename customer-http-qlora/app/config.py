from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


PROJECT_DIR = Path(__file__).resolve().parents[1]
REPOSITORY_DIR = PROJECT_DIR.parent
load_dotenv(PROJECT_DIR / ".env")


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class Settings:
    app_name: str
    host: str
    port: int
    base_model_path: Path
    adapter_path: Path
    load_in_4bit: bool
    enable_thinking: bool
    max_input_tokens: int
    default_max_new_tokens: int
    api_key: str | None
    cors_origins: tuple[str, ...]

    @classmethod
    def from_env(cls) -> "Settings":
        default_model = (
            REPOSITORY_DIR
            / "customer-service-qlora"
            / "win"
            / "models"
            / "Qwen3-8B"
        )
        default_adapter = (
            REPOSITORY_DIR
            / "customer-service-qlora"
            / "win"
            / "outputs"
            / "qwen3-8b"
            / "customer-service-demo-qlora"
        )
        origins = tuple(
            item.strip()
            for item in os.getenv("CORS_ORIGINS", "*").split(",")
            if item.strip()
        )
        return cls(
            app_name=os.getenv("APP_NAME", "Customer Service QLoRA API"),
            host=os.getenv("HOST", "127.0.0.1"),
            port=int(os.getenv("PORT", "8000")),
            base_model_path=Path(os.getenv("BASE_MODEL_PATH", str(default_model))),
            adapter_path=Path(os.getenv("ADAPTER_PATH", str(default_adapter))),
            load_in_4bit=_env_bool("LOAD_IN_4BIT", True),
            enable_thinking=_env_bool("ENABLE_THINKING", False),
            max_input_tokens=int(os.getenv("MAX_INPUT_TOKENS", "2048")),
            default_max_new_tokens=int(os.getenv("DEFAULT_MAX_NEW_TOKENS", "256")),
            api_key=os.getenv("API_KEY") or None,
            cors_origins=origins or ("*",),
        )
