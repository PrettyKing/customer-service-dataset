from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_name: str
    host: str
    port: int
    qdrant_url: str
    qdrant_api_key: str | None
    collection_name: str
    embedding_model: str
    embedding_dimension: int
    rerank_enabled: bool
    rerank_model: str
    chunk_size: int
    chunk_overlap: int
    search_candidates: int
    cors_origins: tuple[str, ...]

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        origins = tuple(
            item.strip()
            for item in os.getenv(
                "CORS_ORIGINS",
                "http://127.0.0.1:5173,http://localhost:5173",
            ).split(",")
            if item.strip()
        )
        return cls(
            app_name=os.getenv("APP_NAME", "Customer Service RAG API"),
            host=os.getenv("HOST", "127.0.0.1"),
            port=int(os.getenv("PORT", "8200")),
            qdrant_url=os.getenv("QDRANT_URL", "http://127.0.0.1:6333").rstrip("/"),
            qdrant_api_key=os.getenv("QDRANT_API_KEY") or None,
            collection_name=os.getenv("QDRANT_COLLECTION", "customer_service_knowledge_v1"),
            embedding_model=os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5"),
            embedding_dimension=int(os.getenv("EMBEDDING_DIMENSION", "512")),
            rerank_enabled=_env_bool("RERANK_ENABLED", True),
            rerank_model=os.getenv("RERANK_MODEL", "BAAI/bge-reranker-base"),
            chunk_size=int(os.getenv("CHUNK_SIZE", "600")),
            chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "80")),
            search_candidates=int(os.getenv("SEARCH_CANDIDATES", "20")),
            cors_origins=origins,
        )
