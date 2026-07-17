interface StatusBadgeProps {
  online: boolean | null;
}


export function StatusBadge({ online }: StatusBadgeProps) {
  const label = online === null ? "连接中" : online ? "服务正常" : "服务离线";
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-medium text-ink/70">
      <span
        className={`size-2 rounded-full ${
          online === null ? "bg-amber-400" : online ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      {label}
    </div>
  );
}
