import { Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { ConversationSummary } from "../types";


interface ConversationListProps {
  conversations: ConversationSummary[];
  activeId: string;
  loading: boolean;
  onOpen: (threadId: string) => void;
  onRename: (threadId: string, title: string) => Promise<void>;
  onDelete: (threadId: string) => Promise<void>;
}

function shortDate(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export function ConversationList({
  conversations,
  activeId,
  loading,
  onOpen,
  onRename,
  onDelete
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (editingId && !conversations.some((item) => item.id === editingId)) setEditingId(null);
  }, [conversations, editingId]);

  const save = async (threadId: string) => {
    const title = draft.trim();
    if (!title) return;
    setBusyId(threadId);
    try {
      await onRename(threadId, title);
      setEditingId(null);
    } catch {
      // Keep edit mode open so the user can retry.
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (threadId: string) => {
    setBusyId(threadId);
    try {
      await onDelete(threadId);
    } catch {
      // Keep the item in place when deletion fails.
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-5 min-h-0 flex-1 border-t border-ink/8 pt-4">
      <div className="flex items-center justify-between px-2">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-ink/40 uppercase">历史会话</p>
        {loading && <LoaderCircle size={13} className="animate-spin text-ink/35" />}
      </div>
      <div className="mt-2 max-h-[calc(100vh-430px)] space-y-1 overflow-y-auto pr-1">
        {!loading && conversations.length === 0 && (
          <p className="px-2 py-3 text-xs leading-5 text-ink/35">发送第一条消息后，会话会保存在这里。</p>
        )}
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`group relative rounded-xl transition ${activeId === conversation.id ? "bg-white/85 shadow-sm" : "hover:bg-white/50"}`}
          >
            {editingId === conversation.id ? (
              <form onSubmit={(event) => { event.preventDefault(); void save(conversation.id); }} className="flex items-center gap-1 p-2">
                <input
                  autoFocus
                  value={draft}
                  maxLength={60}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                />
                <button type="submit" disabled={busyId === conversation.id} aria-label="保存名称" className="rounded-md p-1 text-emerald-700 hover:bg-emerald-50"><Check size={13} /></button>
                <button type="button" onClick={() => setEditingId(null)} aria-label="取消编辑" className="rounded-md p-1 text-ink/40 hover:bg-ink/5"><X size={13} /></button>
              </form>
            ) : (
              <>
                <button onClick={() => onOpen(conversation.id)} className="w-full px-3 py-2.5 pr-14 text-left">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{conversation.title}</span>
                    <span className="text-[9px] text-ink/30 group-hover:opacity-0">{shortDate(conversation.updatedAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-ink/38">{conversation.preview}</p>
                </button>
                <div className="absolute right-1.5 top-2 flex opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    onClick={() => { setDraft(conversation.title); setEditingId(conversation.id); }}
                    aria-label="重命名会话"
                    className="rounded-md p-1.5 text-ink/35 hover:bg-white hover:text-ink"
                  ><Pencil size={12} /></button>
                  <button
                    onClick={() => void remove(conversation.id)}
                    disabled={busyId === conversation.id}
                    aria-label="删除会话"
                    className="rounded-md p-1.5 text-ink/35 hover:bg-red-50 hover:text-red-600"
                  >{busyId === conversation.id ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />}</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
