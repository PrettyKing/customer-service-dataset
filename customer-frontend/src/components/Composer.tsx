import { ArrowUp, LoaderCircle, Paperclip } from "lucide-react";
import { useRef } from "react";


interface ComposerProps {
  value: string;
  loading: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}


export function Composer({ value, loading, disabled, onChange, onSend }: ComposerProps) {
  const composing = useRef(false);
  return (
    <div className="border-t border-ink/8 bg-paper/95 px-4 py-4 backdrop-blur sm:px-7 sm:py-5">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-ink/15 bg-white p-2 shadow-[0_8px_30px_rgba(31,42,38,0.08)] focus-within:border-ink/35">
          <button aria-label="添加附件" disabled className="mb-0.5 grid size-10 shrink-0 place-items-center rounded-xl text-ink/35 disabled:cursor-not-allowed">
            <Paperclip size={18} />
          </button>
          <textarea
            rows={1}
            value={value}
            disabled={disabled}
            placeholder="输入订单号，或描述您遇到的问题…"
            onChange={(event) => onChange(event.target.value)}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={() => { composing.current = false; }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !composing.current) {
                event.preventDefault();
                onSend();
              }
            }}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-6 text-ink outline-none placeholder:text-ink/35 disabled:cursor-not-allowed"
          />
          <button
            aria-label="发送消息"
            onClick={onSend}
            disabled={disabled || !value.trim()}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-white transition hover:bg-[#ad512a] disabled:cursor-not-allowed disabled:bg-ink/15"
          >
            {loading ? <LoaderCircle className="animate-spin" size={17} /> : <ArrowUp size={18} strokeWidth={2.2} />}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] tracking-wide text-ink/35">按 Enter 发送 · Shift + Enter 换行 · 物流信息以承运商更新为准</p>
      </div>
    </div>
  );
}
