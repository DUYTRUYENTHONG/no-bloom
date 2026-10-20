"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/content";
import { connectCounterConsent, getVisitorCounterClient, type CounterState } from "@/lib/counter/client";

export function VisitorCounter({ locale }: { locale: Locale }) {
  const [state, setState] = useState<CounterState>({ kind: "idle" });
  const enabled = process.env.NEXT_PUBLIC_COUNTER_ENABLED === "true";
  useEffect(() => {
    if (!enabled) return;
    const client = getVisitorCounterClient();
    if (!client) return;
    const disconnect = connectCounterConsent(client);
    const unsubscribe = client.subscribe(setState);
    return () => { unsubscribe(); disconnect(); };
  }, [enabled]);
  if (!enabled || state.kind === "idle" || state.kind === "disabled") return null;
  if (state.kind === "loading") return <p className="visitor-counter" role="status">{locale === "vi" ? "Đang ghi nhận lượt ghé…" : "Recording this visit…"}</p>;
  if (state.kind === "rate_limited" || state.kind === "unavailable") return <p className="visitor-counter" role="status">{locale === "vi" ? "Số lượt ghé hiện chưa khả dụng." : "Visit count is currently unavailable."}</p>;
  if (state.kind !== "success") return null;
  const { total, ordinal } = state.values;
  return <p className="visitor-counter" role="status">{locale === "vi" ? <>Lượt ghé được ghi nhận <strong>#{ordinal.toLocaleString("vi-VN")}</strong> · <strong>{total.toLocaleString("vi-VN")}</strong> trình duyệt</> : <>Recorded visit <strong>#{ordinal.toLocaleString("en-US")}</strong> · <strong>{total.toLocaleString("en-US")}</strong> browsers</>}</p>;
}
