"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/content";
import { getPageViewTracker, type Consent } from "@/lib/analytics/tracker";

const words = {
  vi: {
    privacy: "Quyền riêng tư", title: "Phân tích lượt truy cập (tùy chọn)",
    body: "Thống kê lượt xem, trình duyệt ước tính và thành phố/quốc gia gần đúng do nền tảng cung cấp. Không lưu IP, vị trí chính xác, tên hay lời chúc của bạn.",
    accept: "Đồng ý", decline: "Không, cảm ơn", close: "Đóng", previous: "Lựa chọn mới chỉ áp dụng cho các lượt truy cập sau. Dữ liệu đã ghi trước đó không tự động bị xóa.",
  },
  en: {
    privacy: "Privacy", title: "Optional visit analytics",
    body: "Count page views, estimated browsers and approximate city/country supplied by the hosting platform. We do not store your IP, precise location, name or greeting.",
    accept: "Allow", decline: "No, thanks", close: "Close", previous: "Your new choice affects future tracking. Previously recorded data is not automatically deleted.",
  },
};

export function AnalyticsPreference({ locale }: { locale: Locale }) {
  const [consent, setConsent] = useState<Consent>("unknown");
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); setOpen(false); trigger.current?.focus({ preventScroll: true }); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
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
  function close() { setOpen(false); trigger.current?.focus({ preventScroll: true }); }
  function choose(choice: "accepted" | "declined") { getPageViewTracker()?.choose(choice); close(); }
  return <>
    <button ref={trigger} type="button" className="privacy-button" onClick={() => { if (open) close(); else { setOpen(true); requestAnimationFrame(() => panel.current?.focus()); } }} aria-expanded={open} aria-controls="analytics-choice">{t.privacy}</button>
    <span className="visually-hidden" role="status">{open && consent === "unknown" ? t.title : ""}</span>
    {open && <section ref={panel} id="analytics-choice" className="analytics-choice" tabIndex={-1} aria-label={t.title} onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
      <strong>{t.title}</strong>
      <p>{t.body}</p>
      {consent !== "unknown" && <p className="analytics-previous">{t.previous}</p>}
      <div className="analytics-choice-actions">
        <button type="button" onClick={() => choose("accepted")}>{t.accept}</button>
        <button type="button" onClick={() => choose("declined")}>{t.decline}</button>
        {consent !== "unknown" && <button type="button" onClick={close}>{t.close}</button>}
      </div>
    </section>}
  </>;
}
