import { RotateCcw } from "lucide-react";
import Markdown from "react-markdown";

import type { ChatMessage } from "../types";
import { ShipmentCard } from "./ShipmentCard";


interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: () => void;
}


export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const time = message.createdAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`message-enter flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] sm:max-w-[76%] ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && <p className="mb-2 ml-1 text-[11px] font-semibold tracking-[0.12em] text-ink/35 uppercase">栖岸客服</p>}
        <div
          className={
            isUser
              ? "rounded-[20px] rounded-br-md bg-ink px-4 py-3 text-[15px] leading-7 text-white shadow-sm"
              : `rounded-[20px] rounded-bl-md border px-5 py-4 text-[15px] leading-7 shadow-sm ${
                  message.failed
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-ink/10 bg-white text-ink"
                }`
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="message-markdown">
              <Markdown>{message.content}</Markdown>
            </div>
          )}
          {message.failed && onRetry && (
            <button onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline">
              <RotateCcw size={13} />重新发送
            </button>
          )}
        </div>
        {message.shipment && <ShipmentCard shipment={message.shipment} />}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[...new Map(message.sources.map((source) => [source.documentId, source])).values()].map((source) => (
              <span key={source.documentId} className="rounded-full border border-ink/10 bg-white px-3 py-1 text-[10px] text-ink/45">参考 · {source.title}</span>
            ))}
          </div>
        )}
        <p className={`mt-1.5 px-1 text-[10px] text-ink/30 ${isUser ? "text-right" : "text-left"}`}>{time}</p>
      </div>
    </div>
  );
}
