from __future__ import annotations

import hashlib
import threading
import uuid
from datetime import UTC, datetime
from typing import Any

from fastembed import TextEmbedding
from fastembed.rerank.cross_encoder import TextCrossEncoder
from qdrant_client import QdrantClient, models

from .chunking import chunk_text
from .config import Settings


class KnowledgeService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            timeout=20,
        )
        self._embedding: TextEmbedding | None = None
        self._reranker: TextCrossEncoder | None = None
        self._model_lock = threading.Lock()

    @property
    def embedding(self) -> TextEmbedding:
        if self._embedding is None:
            with self._model_lock:
                if self._embedding is None:
                    self._embedding = TextEmbedding(model_name=self.settings.embedding_model)
        return self._embedding

    @property
    def reranker(self) -> TextCrossEncoder:
        if self._reranker is None:
            with self._model_lock:
                if self._reranker is None:
                    self._reranker = TextCrossEncoder(model_name=self.settings.rerank_model)
        return self._reranker

    def ensure_collection(self) -> None:
        if self.client.collection_exists(self.settings.collection_name):
            info = self.client.get_collection(self.settings.collection_name)
            vectors = info.config.params.vectors
            size = getattr(vectors, "size", None)
            if size is not None and size != self.settings.embedding_dimension:
                raise RuntimeError(
                    f"集合向量维度为 {size}，配置要求 {self.settings.embedding_dimension}，请更换集合名"
                )
            return
        self.client.create_collection(
            collection_name=self.settings.collection_name,
            vectors_config=models.VectorParams(
                size=self.settings.embedding_dimension,
                distance=models.Distance.COSINE,
            ),
        )
        for field in ("document_id", "created_at"):
            self.client.create_payload_index(
                collection_name=self.settings.collection_name,
                field_name=field,
                field_schema=models.PayloadSchemaType.KEYWORD,
            )

    def health(self) -> dict[str, Any]:
        self.ensure_collection()
        info = self.client.get_collection(self.settings.collection_name)
        return {
            "status": "ready",
            "qdrant": self.settings.qdrant_url,
            "collection": self.settings.collection_name,
            "points": info.points_count or 0,
            "embedding_model": self.settings.embedding_model,
            "rerank_enabled": self.settings.rerank_enabled,
        }

    def ingest(self, title: str, filename: str, content_type: str, content: str) -> dict[str, Any]:
        self.ensure_collection()
        chunks = chunk_text(content, self.settings.chunk_size, self.settings.chunk_overlap)
        if not chunks:
            raise ValueError("文档没有可摄取的文本内容")
        document_id = str(uuid.uuid4())
        created_at = datetime.now(UTC).isoformat()
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
        vectors = list(self.embedding.passage_embed(chunks))
        points: list[models.PointStruct] = []
        for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{document_id}:{index}:{content_hash}"))
            points.append(models.PointStruct(
                id=point_id,
                vector=vector.tolist(),
                payload={
                    "document_id": document_id,
                    "title": title,
                    "filename": filename,
                    "content_type": content_type,
                    "chunk_index": index,
                    "chunk_count": len(chunks),
                    "character_count": len(content),
                    "content_hash": content_hash,
                    "created_at": created_at,
                    "content": chunk,
                },
            ))
        self.client.upsert(
            collection_name=self.settings.collection_name,
            points=points,
            wait=True,
        )
        return points[0].payload or {}

    def _scroll_all(self, document_id: str | None = None) -> list[dict[str, Any]]:
        self.ensure_collection()
        query_filter = None
        if document_id:
            query_filter = models.Filter(must=[
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchValue(value=document_id),
                )
            ])
        payloads: list[dict[str, Any]] = []
        offset = None
        while True:
            records, offset = self.client.scroll(
                collection_name=self.settings.collection_name,
                scroll_filter=query_filter,
                limit=256,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )
            payloads.extend(record.payload or {} for record in records)
            if offset is None:
                break
        return payloads

    def list_documents(self) -> list[dict[str, Any]]:
        documents: dict[str, dict[str, Any]] = {}
        for payload in self._scroll_all():
            document_id = str(payload.get("document_id", ""))
            if document_id and document_id not in documents:
                documents[document_id] = payload
        return sorted(documents.values(), key=lambda item: str(item.get("created_at", "")), reverse=True)

    def get_document(self, document_id: str) -> dict[str, Any] | None:
        chunks = self._scroll_all(document_id)
        if not chunks:
            return None
        chunks.sort(key=lambda item: int(item.get("chunk_index", 0)))
        result = dict(chunks[0])
        result["content"] = "\n\n".join(str(item.get("content", "")) for item in chunks)
        return result

    def delete_document(self, document_id: str) -> bool:
        if self.get_document(document_id) is None:
            return False
        self.client.delete(
            collection_name=self.settings.collection_name,
            points_selector=models.FilterSelector(filter=models.Filter(must=[
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchValue(value=document_id),
                )
            ])),
            wait=True,
        )
        return True

    def search(self, query: str, top_k: int, use_rerank: bool) -> tuple[list[dict[str, Any]], bool]:
        self.ensure_collection()
        query_vector = list(self.embedding.query_embed(query))[0]
        candidates = self.client.query_points(
            collection_name=self.settings.collection_name,
            query=query_vector.tolist(),
            limit=max(top_k, self.settings.search_candidates),
            with_payload=True,
            with_vectors=False,
        ).points
        rows = [{
            **(point.payload or {}),
            "vector_score": float(point.score),
            "rerank_score": None,
        } for point in candidates]
        reranked = bool(rows and use_rerank and self.settings.rerank_enabled)
        if reranked:
            documents = [str(row.get("content", "")) for row in rows]
            scores = list(self.reranker.rerank(query, documents))
            for row, score in zip(rows, scores, strict=True):
                row["rerank_score"] = float(score)
            rows.sort(key=lambda row: float(row["rerank_score"]), reverse=True)
        return rows[:top_k], reranked
