"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/content";
import dynamic from "next/dynamic";
const DanceMoment = dynamic(() => import("./DanceMoment").then((module) => module.DanceMoment), { ssr: false });

type Stage = "invitation" | "personalization" | "blooming" | "greeting" | "withering";
type Message = { role: "user" | "assistant"; text: string };

const guidance = {
  vi: {
    title: "Bạn đồng hành NỞ", open: "Mở bạn đồng hành", close: "Đóng bạn đồng hành", send: "Gửi", placeholder: "Hỏi về món quà…", waiting: "Đang nghĩ…",
    intro: "Mình ở đây để giúp bạn khám phá món quà.", offline: "Trò chuyện AI đang chưa sẵn sàng. Mình vẫn có thể chỉ bạn cách dùng món quà.", disclosure: "Khi gửi, nội dung câu hỏi được xử lý qua Groq. Đừng nhập thông tin riêng tư.",
    prompts: ["Cách tạo liên kết riêng?", "Làm sao chọn hoa?", "Có thể bỏ qua hiệu ứng?"],
    answers: ["Nhập tên, mở lời chúc rồi chọn “Sao chép liên kết riêng”. Người nhận mở liên kết sẽ không cần nhập tên.", "Chọn loài hoa ở bước nhập tên trước khi bắt đầu nở.", "Có. Chọn “Mở ngay” trong lúc hoa nở hoặc “Xem hoa tĩnh” dưới khung hoa."],
    stage: { invitation: "Bắt đầu bằng “Mở món quà” nhé.", personalization: "Bạn có thể chọn hoa và nhập tên, hoặc tiếp tục không cần tên.", blooming: "Hoa đang nở. Bạn có thể chọn “Mở ngay”.", greeting: "Lời chúc đã sẵn sàng. Bạn có thể sao chép liên kết riêng hoặc xem hoa nở lại.", withering: "Một đóa hoa mới đang được chuẩn bị." },
  },
  en: {
    title: "NỞ companion", open: "Open companion", close: "Close companion", send: "Send", placeholder: "Ask about the gift…", waiting: "Thinking…",
    intro: "I can help you explore this gift.", offline: "AI chat is not available yet. I can still explain how to use the gift.", disclosure: "Questions you send are processed by Groq. Please avoid private information.",
    prompts: ["How do I make a personal link?", "How can I choose a flower?", "Can I skip the animation?"],
    answers: ["Enter a name, open the greeting, then choose “Copy personal link”. The recipient will not need to enter a name.", "Choose a flower at the name-entry step before starting the bloom.", "Yes. Choose “Show me now” during the bloom or “View still flower” below it."],
    stage: { invitation: "Start with “Open your gift”.", personalization: "Choose a flower and enter a name, or continue without one.", blooming: "The flowers are opening. You can choose “Show me now”.", greeting: "Your greeting is ready. Copy the personal link or replay the bloom.", withering: "A new flower is being prepared." },
  },
} as const;

function localAnswer(locale: Locale, text: string): string {
  const t = guidance[locale];
  const normalized = text.toLocaleLowerCase();
  const index = /link|liên kết|share|chia sẻ/.test(normalized) ? 0 : /flower|hoa|chọn/.test(normalized) ? 1 : /skip|bỏ qua|animation|hiệu ứng/.test(normalized) ? 2 : -1;
  return index >= 0 ? t.answers[index as 0 | 1 | 2] : t.offline;
}

export function FlowerGuide({ locale, stage }: { locale: Locale; stage: Stage }) {
  const t = guidance[locale];
  const endpoint = process.env.NEXT_PUBLIC_GUIDE_ENDPOINT?.trim();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState(false);
  const [dancing, setDancing] = useState(false);
  const actor = useRef<HTMLSpanElement>(null);
  const pointerActor = useRef<HTMLSpanElement>(null);
  const abort = useRef<AbortController | null>(null);
  const scrollState = useRef({ last: 0, raf: 0, settle: 0 });
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onScroll = () => {
      const state = scrollState.current;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (state.raf) return;
      state.raf = requestAnimationFrame(() => {
        const delta = Math.max(-14, Math.min(14, window.scrollY - state.last));
        if (actor.current) actor.current.style.transform = `perspective(460px) translateY(${Math.abs(delta) * -0.25}px) rotateY(${delta * 0.42}deg) rotateZ(${delta * 0.14}deg)`;
        state.last = window.scrollY;
        state.raf = 0;
        clearTimeout(state.settle);
        state.settle = window.setTimeout(() => { if (actor.current) actor.current.style.transform = ""; }, 140);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (scrollState.current.raf) cancelAnimationFrame(scrollState.current.raf); clearTimeout(scrollState.current.settle); };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setActing(false), 520);
    setActing(true);
    return () => window.clearTimeout(timer);
  }, [stage]);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && !document.getElementById("analytics-choice")) { event.preventDefault(); abort.current?.abort(); setBusy(false); setOpen(false); trigger.current?.focus({ preventScroll: true }); }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);

  function close() { abort.current?.abort(); setBusy(false); setDancing(false); setOpen(false); trigger.current?.focus({ preventScroll: true }); }

  function leanTowardPointer(event: React.PointerEvent<HTMLButtonElement>) {
    if (!pointerActor.current || event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -8;
    pointerActor.current.style.transform = `perspective(460px) rotateY(${x}deg) rotateX(${y}deg)`;
  }

  async function send(text: string) {
    const value = text.trim().slice(0, 400);
    if (!value || busy) return;
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: value }]);
    if (!endpoint) { setMessages((current) => [...current, { role: "assistant", text: localAnswer(locale, value) }]); return; }
    const controller = new AbortController(); abort.current = controller;
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: value, locale, stage }), signal: controller.signal });
      if (!response.ok) throw new Error("Guide unavailable");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("answer" in data) || typeof data.answer !== "string" || data.answer.length > 1200) throw new Error("Invalid guide response");
      const answer = data.answer as string;
      setMessages((current) => [...current, { role: "assistant", text: answer }]);
    } catch {
      if (!controller.signal.aborted) setMessages((current) => [...current, { role: "assistant", text: localAnswer(locale, value) }]);
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  return <aside className={`flower-guide ${open ? "is-open" : ""} ${dancing ? "is-dancing" : ""}`} aria-label={t.title}>
    {open && <div ref={panel} id="flower-guide-panel" className="guide-panel" role="dialog" aria-labelledby="flower-guide-title" tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <div className="guide-heading"><strong id="flower-guide-title">{t.title}</strong><button ref={closeButton} type="button" onClick={close} aria-label={t.close}>×</button></div>
      <p className="guide-intro">{t.intro} {t.stage[stage]}</p>
      <div className="guide-messages" role="log" aria-label={locale === "vi" ? "Cuộc trò chuyện" : "Conversation"} aria-live="polite" aria-relevant="additions">{messages.map((message, index) => <p key={index} className={`guide-message is-${message.role}`}>{message.text}</p>)}</div>
      <div className="guide-prompts">{t.prompts.map((prompt) => <button key={prompt} type="button" onClick={() => send(prompt)} disabled={busy}>{prompt}</button>)}</div>
      {endpoint && <form className="guide-form" onSubmit={(event) => { event.preventDefault(); void send(question); }}><label className="visually-hidden" htmlFor="guide-question">{t.placeholder}</label><input id="guide-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t.placeholder} maxLength={400} disabled={busy} /><button type="submit" disabled={busy || !question.trim()}>{busy ? t.waiting : t.send}</button></form>}
      {endpoint && <p className="guide-disclosure">{t.disclosure}</p>}
      {!endpoint && <p className="guide-disclosure">{t.offline}</p>}
      <DanceMoment locale={locale} onPlayingChange={setDancing} />
    </div>}
    <button ref={trigger} className="guide-actor-button" type="button" aria-label={open ? t.close : t.open} aria-expanded={open} aria-controls="flower-guide-panel" onPointerMove={leanTowardPointer} onPointerLeave={() => { if (pointerActor.current) pointerActor.current.style.transform = ""; }} onClick={() => { if (open) close(); else { setOpen(true); requestAnimationFrame(() => closeButton.current?.focus()); } }}>
      <span ref={actor} className="guide-scroll-motion"><span ref={pointerActor} className="guide-pointer-motion">{dancing ? <span className="guide-dance-sprite" style={{ backgroundImage: "url('guide-dance.webp')" }} aria-hidden="true" /> : <img className={acting ? "is-acting" : ""} src={busy ? "guide-avatar-thinking.webp" : open || stage === "greeting" ? "guide-avatar-wave.webp" : "guide-avatar.webp"} width="112" height="145" decoding="async" alt="" />}</span></span>
      <span aria-hidden="true">{open ? "×" : "?"}</span>
    </button>
  </aside>;
}
