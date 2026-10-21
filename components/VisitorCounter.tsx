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
  if (!enabled || state.kind === "idle" || state.kind === "disabled") return null;
  const count = state.kind === "success" ? state.values.pageViews.toLocaleString(locale === "vi" ? "vi-VN" : "en-US") : null;
  const label = count ? `${count} ${locale === "vi" ? "lượt xem" : "page views"}` : state.kind === "loading" ? (locale === "vi" ? "Đang tải lượt xem" : "Loading page views") : (locale === "vi" ? "Lượt xem chưa khả dụng" : "Page views unavailable");
  return <p className="visitor-counter" role="status" aria-label={label} title={label}><span aria-hidden="true">{count ?? (state.kind === "loading" ? "…" : "—")}</span></p>;
}
