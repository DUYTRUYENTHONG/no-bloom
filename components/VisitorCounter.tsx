"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/content";
import { getTrafficTracker, type TrafficState } from "@/lib/traffic/client";

export function VisitorCounter({ locale }: { locale: Locale }) {
  const [state, setState] = useState<TrafficState>({ kind: "idle" });
  const enabled = process.env.NEXT_PUBLIC_COUNTER_ENABLED === "true";
  useEffect(() => {
    if (!enabled) return;
    const client = getTrafficTracker();
    if (!client) { setState({ kind: "unavailable" }); return; }
    const unsubscribe = client.subscribe(setState);
    return unsubscribe;
  }, [enabled]);
  if (!enabled) return <p className="visitor-counter">{locale === "vi" ? "Lượt ghé: chưa khả dụng" : "Visit count unavailable"}</p>;
  if (state.kind === "idle" || state.kind === "disabled") return <p className="visitor-counter">{locale === "vi" ? "Thống kê lượt ghé tùy chọn" : "Optional visit counting"}</p>;
  if (state.kind === "loading") return <p className="visitor-counter" role="status">{locale === "vi" ? "Đang ghi nhận lượt ghé…" : "Recording this visit…"}</p>;
  if (state.kind === "unavailable") return <p className="visitor-counter" role="status">{locale === "vi" ? "Số lượt ghé hiện chưa khả dụng." : "Visit count is currently unavailable."}</p>;
  if (state.kind !== "success") return null;
  const { pageViews, uniqueBrowsers } = state.values;
  return <p className="visitor-counter" role="status">{locale === "vi" ? <><strong>{pageViews.toLocaleString("vi-VN")}</strong> lượt xem · <strong>{uniqueBrowsers.toLocaleString("vi-VN")}</strong> trình duyệt ước tính</> : <><strong>{pageViews.toLocaleString("en-US")}</strong> views · <strong>{uniqueBrowsers.toLocaleString("en-US")}</strong> estimated browsers</>}</p>;
}
