import { Headphones, Inbox, LayoutGrid, MessageSquareText, PackageSearch, Plus, Settings2, Sparkles, TicketCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Composer } from "./components/Composer";
import { MessageBubble } from "./components/MessageBubble";
import { StatusBadge } from "./components/StatusBadge";
import { checkAgent, sendToAgent } from "./lib/mastra";
import type { ChatMessage } from "./types";


const starterMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "您好，我是栖岸商店客服。您可以直接告诉我订单号，我会为您查询发货进度和最新物流；退换货、退款或商品问题也可以问我。",
  createdAt: new Date()
};

const quickOrders = [
  { id: "ORD-20260717-001", label: "运输中", tone: "bg-blue-500" },
  { id: "ORD-20260717-002", label: "已签收", tone: "bg-emerald-500" },
  { id: "ORD-20260717-003", label: "配送异常", tone: "bg-red-500" },
  { id: "ORD-20260717-004", label: "待发货", tone: "bg-amber-500" }
];

function createMessage(role: "user" | "assistant", content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date() };
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const result = await checkAgent();
      if (active) setOnline(result);
    };
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => { active = false; window.clearInterval(timer); controllerRef.current?.abort(); };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submit = useCallback(async (prompt: string) => {
    const text = prompt.trim();
    if (!text || loading) return;
    const userMessage = createMessage("user", text);
    const nextHistory = [...messages.filter((message) => !message.failed), userMessage];
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLastPrompt(text);
    setLoading(true);
    controllerRef.current = new AbortController();
    try {
      const result = await sendToAgent(nextHistory, controllerRef.current.signal);
      setMessages((current) => [
        ...current,
        { ...createMessage("assistant", result.text), shipment: result.shipment }
      ]);
      setOnline(true);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "未知错误";
      setMessages((current) => [
        ...current,
        { ...createMessage("assistant", `暂时无法连接客服服务。${reason}`), failed: true }
      ]);
      setOnline(false);
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  }, [loading, messages]);

  const resetChat = () => {
    controllerRef.current?.abort();
    setMessages([{ ...starterMessage, id: crypto.randomUUID(), createdAt: new Date() }]);
    setInput("");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-paper text-ink lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)_288px]">
        <aside className="hidden border-r border-ink/10 bg-[#e9e5dc] px-4 py-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-9 place-items-center rounded-xl bg-ink text-sm font-bold text-paper">栖</div>
            <div><p className="font-semibold tracking-tight">栖岸商店</p><p className="text-[10px] tracking-[0.15em] text-ink/45 uppercase">Service desk</p></div>
          </div>
          <button onClick={resetChat} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-sm font-medium text-white hover:bg-ink/90">
            <Plus size={16} /> 新建会话
          </button>
          <nav className="mt-5 space-y-1 text-sm">
            <a className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2.5 font-medium shadow-sm" href="#"><MessageSquareText size={17} />在线客服</a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-ink/55 hover:bg-white/50" href="#"><Inbox size={17} />待处理</a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-ink/55 hover:bg-white/50" href="#"><TicketCheck size={17} />服务记录</a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-ink/55 hover:bg-white/50" href="#"><LayoutGrid size={17} />知识库</a>
          </nav>
          <div className="mt-auto rounded-2xl border border-ink/10 bg-white/55 p-4">
            <Headphones size={18} className="text-accent" />
            <p className="mt-3 text-xs font-semibold">服务时间</p>
            <p className="mt-1 text-xs leading-5 text-ink/50">周一至周日<br />09:00 — 22:00</p>
          </div>
          <button className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-ink/50"><Settings2 size={15} />工作台设置</button>
        </aside>

        <main className="flex min-h-screen min-w-0 flex-col lg:min-h-0">
          <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-ink/8 bg-paper/90 px-4 backdrop-blur sm:px-7">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-ink text-sm font-bold text-paper lg:hidden">栖</div>
              <div><h1 className="font-semibold tracking-tight">在线客服</h1><p className="text-xs text-ink/45">订单、物流与售后咨询</p></div>
            </div>
            <StatusBadge online={online} />
          </header>

          <div className="chat-grid flex-1 overflow-y-auto px-4 py-7 sm:px-7">
            <div className="mx-auto max-w-3xl space-y-7">
              <div className="flex items-center gap-3 py-1"><span className="h-px flex-1 bg-ink/8" /><span className="text-[10px] font-medium tracking-[0.14em] text-ink/35 uppercase">本次会话</span><span className="h-px flex-1 bg-ink/8" /></div>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} onRetry={message.failed ? () => void submit(lastPrompt) : undefined} />
              ))}
              {loading && (
                <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-ink/10 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-1.5"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div><p className="mt-2 text-xs text-ink/40">正在查询并整理信息…</p></div></div>
              )}
              <div ref={endRef} />
            </div>
          </div>
          <Composer value={input} loading={loading} disabled={loading} onChange={setInput} onSend={() => void submit(input)} />
        </main>

        <aside className="hidden overflow-y-auto border-l border-ink/10 bg-[#f8f6f1] px-5 py-6 xl:block">
          <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold tracking-[0.14em] text-ink/40 uppercase">快捷查询</p><h2 className="mt-1 font-semibold">演示订单</h2></div><PackageSearch size={20} className="text-accent" /></div>
          <div className="mt-5 space-y-2.5">
            {quickOrders.map((order) => (
              <button key={order.id} onClick={() => void submit(`帮我查一下订单 ${order.id} 的物流进度`)} disabled={loading} className="group w-full rounded-xl border border-ink/10 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-md disabled:opacity-50">
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-semibold">{order.id}</span><span className={`size-2 rounded-full ${order.tone}`} /></div>
                <p className="mt-2 text-xs text-ink/45">{order.label}<span className="float-right opacity-0 transition group-hover:opacity-100">查询 →</span></p>
              </button>
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-ink p-5 text-white">
            <Sparkles size={18} className="text-[#ef986c]" />
            <p className="mt-4 text-sm font-semibold">可以这样提问</p>
            <div className="mt-3 space-y-2 text-xs leading-5 text-white/60">
              <button onClick={() => setInput("我的快递显示异常，应该怎么办？")} className="block text-left hover:text-white">“快递显示异常怎么办？”</button>
              <button onClick={() => setInput("商品还没发货，我可以修改地址吗？")} className="block text-left hover:text-white">“没发货可以改地址吗？”</button>
              <button onClick={() => setInput("已经签收的订单如何申请退货？")} className="block text-left hover:text-white">“签收后如何申请退货？”</button>
            </div>
          </div>
          <div className="mt-6 border-t border-ink/8 pt-5 text-[11px] leading-5 text-ink/40"><p>客服由本地专属模型提供支持</p><p>物流信息来自演示数据服务</p></div>
        </aside>
      </div>
    </div>
  );
}
