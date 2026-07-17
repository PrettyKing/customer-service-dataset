from __future__ import annotations

import asyncio
import io
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader

from .config import Settings
from .schemas import DocumentDetail, DocumentSummary, SearchRequest, SearchResponse, SearchResult
from .service import KnowledgeService


ALLOWED_EXTENSIONS = {".md", ".markdown", ".txt", ".pdf"}


def _extract_text(filename: str, content: bytes) -> str:
    suffix = "." + filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError("仅支持 Markdown、TXT 和 PDF 文档")
    if suffix == ".pdf":
        reader = PdfReader(io.BytesIO(content))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages).strip()
    for encoding in ("utf-8-sig", "utf-8", "gb18030"):
        try:
            return content.decode(encoding).strip()
        except UnicodeDecodeError:
            continue
    raise ValueError("无法识别文档编码，请保存为 UTF-8")


def _summary(payload: dict) -> DocumentSummary:
    return DocumentSummary(
        id=str(payload["document_id"]),
        title=str(payload["title"]),
        filename=str(payload["filename"]),
        content_type=str(payload["content_type"]),
        chunk_count=int(payload["chunk_count"]),
        character_count=int(payload["character_count"]),
        created_at=str(payload["created_at"]),
    )


def create_app(settings: Settings | None = None, service: KnowledgeService | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.knowledge_service = service or KnowledgeService(settings)
        await asyncio.to_thread(app.state.knowledge_service.ensure_collection)
        yield

    app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def get_service() -> KnowledgeService:
        return app.state.knowledge_service

    @app.get("/health", tags=["system"])
    async def health() -> dict:
        return await asyncio.to_thread(get_service().health)

    @app.get("/api/documents", response_model=list[DocumentSummary], tags=["documents"])
    async def list_documents() -> list[DocumentSummary]:
        items = await asyncio.to_thread(get_service().list_documents)
        return [_summary(item) for item in items]

    @app.post("/api/documents", response_model=DocumentSummary, status_code=201, tags=["documents"])
    async def upload_document(
        file: UploadFile = File(...),
        title: str | None = Form(default=None),
    ) -> DocumentSummary:
        filename = file.filename or "document.txt"
        content_bytes = await file.read()
        if len(content_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="单个文档不能超过 10MB")
        try:
            content = _extract_text(filename, content_bytes)
            payload = await asyncio.to_thread(
                get_service().ingest,
                (title or filename.rsplit(".", 1)[0]).strip(),
                filename,
                file.content_type or "application/octet-stream",
                content,
            )
            return _summary(payload)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/documents/{document_id}", response_model=DocumentDetail, tags=["documents"])
    async def get_document(document_id: str) -> DocumentDetail:
        payload = await asyncio.to_thread(get_service().get_document, document_id)
        if payload is None:
            raise HTTPException(status_code=404, detail="文档不存在")
        return DocumentDetail(**_summary(payload).model_dump(), content=str(payload["content"]))

    @app.delete("/api/documents/{document_id}", status_code=204, tags=["documents"])
    async def delete_document(document_id: str) -> None:
        deleted = await asyncio.to_thread(get_service().delete_document, document_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="文档不存在")

    @app.post("/api/search", response_model=SearchResponse, tags=["search"])
    async def search(body: SearchRequest) -> SearchResponse:
        rows, reranked = await asyncio.to_thread(
            get_service().search,
            body.query.strip(),
            body.top_k,
            body.rerank,
        )
        return SearchResponse(
            query=body.query,
            reranked=reranked,
            results=[SearchResult(
                document_id=str(row["document_id"]),
                title=str(row["title"]),
                filename=str(row["filename"]),
                chunk_index=int(row["chunk_index"]),
                content=str(row["content"]),
                vector_score=float(row["vector_score"]),
                rerank_score=row.get("rerank_score"),
            ) for row in rows],
        )

    return app


app = create_app()
