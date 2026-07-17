from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DocumentSummary(BaseModel):
    id: str
    title: str
    filename: str
    content_type: str
    chunk_count: int
    character_count: int
    created_at: datetime


class DocumentDetail(DocumentSummary):
    content: str


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=4, ge=1, le=10)
    rerank: bool = True


class SearchResult(BaseModel):
    document_id: str
    title: str
    filename: str
    chunk_index: int
    content: str
    vector_score: float
    rerank_score: float | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    reranked: bool
