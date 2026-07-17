import { Box, CheckCircle2, CircleAlert, Clock3, MapPin, Truck } from "lucide-react";

import type { Shipment } from "../types";


const statusStyles: Record<string, { icon: typeof Truck; className: string }> = {
  in_transit: { icon: Truck, className: "bg-blue-50 text-blue-700 ring-blue-100" },
  delivered: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  exception: { icon: CircleAlert, className: "bg-red-50 text-red-700 ring-red-100" },
  pending: { icon: Clock3, className: "bg-amber-50 text-amber-700 ring-amber-100" }
};

function formatDate(value: string | null) {
  if (!value) return "待承运商更新";
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(new Date(value));
}

export function ShipmentCard({ shipment }: { shipment: Shipment }) {
  const style = statusStyles[shipment.status] ?? statusStyles.pending;
  const StatusIcon = style.icon;
  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-ink/10 bg-[#fffefa] shadow-[0_12px_30px_rgba(31,42,38,0.07)]">
      <div className="flex items-start justify-between gap-4 border-b border-ink/8 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-ink text-paper">
            <Box size={18} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink/40 uppercase">物流动态</p>
            <p className="mt-0.5 font-semibold text-ink">{shipment.orderId}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${style.className}`}>
          <StatusIcon size={13} />
          {shipment.statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-ink/8 sm:grid-cols-3">
        <div className="bg-[#fffefa] px-4 py-3">
          <p className="text-[11px] text-ink/45">承运商</p>
          <p className="mt-1 text-sm font-medium text-ink">{shipment.carrier ?? "暂未分配"}</p>
        </div>
        <div className="bg-[#fffefa] px-4 py-3">
          <p className="text-[11px] text-ink/45">物流单号</p>
          <p className="mt-1 truncate font-mono text-xs font-medium text-ink">{shipment.trackingNumber ?? "待生成"}</p>
        </div>
        <div className="col-span-2 bg-[#fffefa] px-4 py-3 sm:col-span-1">
          <p className="text-[11px] text-ink/45">预计送达</p>
          <p className="mt-1 text-sm font-medium text-ink">{formatDate(shipment.estimatedDelivery)}</p>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="flex gap-3">
          <MapPin className="mt-0.5 shrink-0 text-accent" size={17} />
          <div>
            <p className="text-sm font-medium text-ink">{shipment.latestEvent}</p>
            <p className="mt-1 text-xs text-ink/45">收件人 {shipment.receiver} · {shipment.receiverPhone}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
