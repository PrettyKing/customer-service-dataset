import { BookOpenText, FileText, LoaderCircle, RefreshCw, Search, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { deleteDocument, listDocuments, searchKnowledge, uploadDocument } from "../lib/knowledge";
import type { KnowledgeDocument, KnowledgeSearchResult } from "../types";


function formatDate(value: string): string {
  return new Date(value).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
}

export function KnowledgeManager({ onBack }: { onBack: () => void }) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [reranked, setReranked] = useState(false);
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDocuments(await listDocuments());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取知识库");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const onUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await uploadDocument(file);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async (document: KnowledgeDocument) => {
    if (!window.confirm(`确认从知识库删除“${document.title}”吗？`)) return;
    setError("");
    try {
      await deleteDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setResults((current) => current.filter((item) => item.document_id !== document.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
    }
  };

  const onSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setError("");
    try {
      const response = await searchKnowledge(query.trim());
      setResults(response.results);
      setReranked(response.reranked);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "检索失败");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button onClick={onBack} className="text-xs font-medium text-ink/45 hover:text-ink">← 返回客服会话</button>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-ink text-white"><BookOpenText size={20} /></div>
              <div><h1 className="text-xl font-semibold tracking-tight">知识库管理</h1><p className="mt-1 text-sm text-ink/45">上传文档后自动切分、向量化并写入 Qdrant</p></div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void refresh()} className="grid size-10 place-items-center rounded-xl border border-ink/10 bg-white hover:border-ink/25" title="刷新"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
            <input ref={fileRef} type="file" accept=".md,.markdown,.txt,.pdf" className="hidden" onChange={(event) => void onUpload(event.target.files?.[0])} />
            <button disabled={uploading} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {uploading ? <LoaderCircle size={16} className="animate-spin" /> : <UploadCloud size={16} />}上传文档
            </button>
          </div>
        </header>

        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <div className="rounded-2xl border border-ink/10 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
              <div><h2 className="text-sm font-semibold">已摄取文档</h2><p className="mt-0.5 text-xs text-ink/40">{documents.length} 份文档 · {documents.reduce((sum, item) => sum + item.chunk_count, 0)} 个知识片段</p></div>
            </div>
            <div className="divide-y divide-ink/8">
              {loading && <div className="flex items-center justify-center gap-2 p-10 text-sm text-ink/40"><LoaderCircle size={16} className="animate-spin" />正在读取 Qdrant…</div>}
              {!loading && documents.length === 0 && <div className="p-10 text-center"><FileText className="mx-auto text-ink/20" /><p className="mt-3 text-sm text-ink/45">还没有文档，先上传 Markdown、TXT 或 PDF</p></div>}
              {documents.map((document) => (
                <div key={document.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper text-ink/55"><FileText size={17} /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{document.title}</p><p className="mt-1 truncate text-xs text-ink/40">{document.filename}</p><p className="mt-2 text-[11px] text-ink/35">{document.chunk_count} 个片段 · {document.character_count.toLocaleString()} 字符 · {formatDate(document.created_at)}</p></div>
                  <button onClick={() => void onDelete(document)} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink/30 hover:bg-red-50 hover:text-red-600" title="删除"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-[#f8f6f1] p-5 shadow-sm">
            <h2 className="text-sm font-semibold">检索测试</h2>
            <p className="mt-1 text-xs leading-5 text-ink/40">用真实问题检查向量召回和 Rerank 排序，不经过客服模型。</p>
            <div className="mt-4 flex gap-2">
              <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void onSearch(); }} placeholder="例如：退货后多久能到账？" className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/30" />
              <button disabled={searching || !query.trim()} onClick={() => void onSearch()} className="grid size-10 place-items-center rounded-xl bg-accent text-white disabled:opacity-40">{searching ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}</button>
            </div>
            {results.length > 0 && <p className="mt-4 text-[11px] font-medium text-ink/40">返回 {results.length} 条 · {reranked ? "已启用 Rerank" : "按向量相似度排序"}</p>}
            <div className="mt-3 space-y-3">
              {results.map((result, index) => (
                <article key={`${result.document_id}-${result.chunk_index}`} className="rounded-xl border border-ink/8 bg-white p-4">
                  <div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-semibold">{index + 1}. {result.title}</p><span className="shrink-0 font-mono text-[10px] text-ink/35">{(result.rerank_score ?? result.vector_score).toFixed(3)}</span></div>
                  <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-ink/60">{result.content}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
