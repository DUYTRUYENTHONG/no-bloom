"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/content";
import { getPageViewTracker, type Consent } from "@/lib/analytics/tracker";

const words = {
  vi: {
    privacy: "Quyền riêng tư", title: "Phân tích lượt truy cập (tùy chọn)",
    body: "Giúp cải thiện món quà này bằng số liệu sử dụng tùy chọn. Tên và lời chúc của bạn không được gửi đi.",
    accept: "Đồng ý", decline: "Không, cảm ơn", close: "Đóng", previous: "Lựa chọn mới chỉ áp dụng cho các lượt truy cập sau. Dữ liệu đã ghi trước đó không tự động bị xóa.",
  },
  en: {
    privacy: "Privacy", title: "Optional visit analytics",
    body: "Help improve this experience with optional usage analytics. Your name and greeting are not included.",
    accept: "Allow", decline: "No, thanks", close: "Close", previous: "Your new choice affects future tracking. Previously recorded data is not automatically deleted.",
  },
};

export function AnalyticsPreference({ locale }: { locale: Locale }) {
  const [consent, setConsent] = useState<Consent>("unknown");
  const [open, setOpen] = useState(false);
  const available = (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" && Boolean(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT)) || process.env.NEXT_PUBLIC_COUNTER_ENABLED === "true";
  useEffect(() => {
    if (!available) return;
    const tracker = getPageViewTracker();
    if (!tracker) return;
    const unsubscribe = tracker.subscribe((choice) => { setConsent(choice); if (choice === "unknown") setOpen(true); });
    tracker.mount();
    return unsubscribe;
  }, [available]);
  if (!available) return null;
  const t = words[locale];
  function choose(choice: "accepted" | "declined") { getPageViewTracker()?.choose(choice); setOpen(false); }
  return <>
    <button type="button" className="privacy-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="analytics-choice">{t.privacy}</button>
    {open && <section id="analytics-choice" className="analytics-choice" aria-label={t.title}>
      <strong>{t.title}</strong>
      <p>{t.body}</p>
      {consent !== "unknown" && <p className="analytics-previous">{t.previous}</p>}
      <div className="analytics-choice-actions">
        <button type="button" onClick={() => choose("accepted")}>{t.accept}</button>
        <button type="button" onClick={() => choose("declined")}>{t.decline}</button>
        {consent !== "unknown" && <button type="button" onClick={() => setOpen(false)}>{t.close}</button>}
      </div>
    </section>}
  </>;
}
