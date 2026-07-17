from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


class FakeKnowledgeService:
    def __init__(self):
        self.documents = []

    def ensure_collection(self):
        return None

    def health(self):
        return {"status": "ready", "points": len(self.documents)}

    def list_documents(self):
        return self.documents

    def ingest(self, title, filename, content_type, content):
        payload = {
            "document_id": "doc-1",
            "title": title,
            "filename": filename,
            "content_type": content_type,
            "chunk_count": 1,
            "character_count": len(content),
            "created_at": datetime.now(UTC).isoformat(),
            "content": content,
        }
        self.documents = [payload]
        return payload

    def get_document(self, document_id):
        return self.documents[0] if self.documents and document_id == "doc-1" else None

    def delete_document(self, document_id):
        if not self.documents or document_id != "doc-1":
            return False
        self.documents = []
        return True

    def search(self, query, top_k, use_rerank):
        if not self.documents:
            return [], False
        return [{
            **self.documents[0],
            "chunk_index": 0,
            "vector_score": 0.88,
            "rerank_score": 0.91,
        }], True


def settings():
    return Settings(
        app_name="test",
        host="127.0.0.1",
        port=8200,
        qdrant_url="http://example.invalid",
        qdrant_api_key=None,
        collection_name="test",
        embedding_model="test",
        embedding_dimension=512,
        rerank_enabled=True,
        rerank_model="test",
        chunk_size=600,
        chunk_overlap=80,
        search_candidates=20,
        cors_origins=("http://localhost",),
    )


def test_document_lifecycle_and_search():
    service = FakeKnowledgeService()
    with TestClient(create_app(settings(), service)) as client:
        assert client.get("/health").status_code == 200
        uploaded = client.post(
            "/api/documents",
            files={"file": ("policy.md", "七天无理由退货规则", "text/markdown")},
        )
        assert uploaded.status_code == 201
        assert uploaded.json()["title"] == "policy"
        assert len(client.get("/api/documents").json()) == 1

        search = client.post("/api/search", json={"query": "怎么退货？", "top_k": 4})
        assert search.status_code == 200
        assert search.json()["reranked"] is True
        assert search.json()["results"][0]["title"] == "policy"

        assert client.delete("/api/documents/doc-1").status_code == 204
        assert client.get("/api/documents").json() == []


def test_reject_unsupported_document():
    with TestClient(create_app(settings(), FakeKnowledgeService())) as client:
        response = client.post(
            "/api/documents",
            files={"file": ("payload.exe", b"nope", "application/octet-stream")},
        )
        assert response.status_code == 400
