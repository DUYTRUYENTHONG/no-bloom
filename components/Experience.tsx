"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy, type Locale } from "@/lib/content";
import { validateName } from "@/lib/name";
import { StaticFlower } from "./StaticFlower";

const FlowerScene = dynamic(() => import("./FlowerScene").then((module) => module.FlowerScene), { ssr: false, loading: () => <StaticFlower /> });
type Stage = "invitation" | "personalization" | "blooming" | "greeting";

export function Experience() {
  const [locale, setLocale] = useState<Locale>("vi");
  const [stage, setStage] = useState<Stage>("invitation");
  const [input, setInput] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [replayKey, setReplayKey] = useState(0);
  const [staticMode, setStaticMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = copy[locale];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReducedMotion(query.matches); if (query.matches) setStaticMode(true); };
    update(); query.addEventListener("change", update);
    try { const canvas = document.createElement("canvas"); if (!canvas.getContext("webgl2") && !canvas.getContext("webgl")) setWebglFailed(true); } catch { setWebglFailed(true); }
    try { const saved = sessionStorage.getItem("no-bloom-name"); if (saved) setInput(saved); } catch { /* storage unavailable */ }
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (stage === "greeting") headingRef.current?.focus();
  }, [stage]);

  const finish = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setStage("greeting");
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function startBloom(selectedName: string | null) {
    setName(selectedName);
    setError("");
    setReplayKey((key) => key + 1);
    setStage("blooming");
    if (staticMode || reducedMotion || webglFailed) timer.current = setTimeout(finish, 250);
    else timer.current = setTimeout(finish, 3400);
  }

  function submitName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateName(input);
    if (!result.valid) { setError(result.tooLong ? t.nameLong : t.nameError); return; }
    try { sessionStorage.setItem("no-bloom-name", result.value); } catch { /* storage unavailable */ }
    startBloom(result.value);
  }

  function replay() { startBloom(name); }
  function clearName() {
    setInput(""); setName(null); setError(""); setStage("personalization");
    try { sessionStorage.removeItem("no-bloom-name"); } catch { /* storage unavailable */ }
  }

  const isOpen = stage === "blooming" || stage === "greeting";
  const showStatic = staticMode || reducedMotion || webglFailed;

  return <main className={`experience stage-${stage}`}>
    <div className="page-wash" aria-hidden="true" />
    <header className="site-header">
      <div className="brand" aria-label="NỞ">NỞ<span className="brand-mark">✳</span></div>
      <div className="header-actions">
        <label className="language-select"><span className="visually-hidden">{t.locale}</span><select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t.locale}><option value="vi">VI</option><option value="en">EN</option></select></label>
      </div>
    </header>

    <div className="experience-grid">
      <section className="story-panel" aria-live="polite">
        <p className="eyebrow">{t.eyebrow}</p>
        {stage === "invitation" && <div className="story-content">
          <p className="overline">A FLOWER, JUST FOR YOU</p>
          <h1>{locale === "vi" ? <>Có một điều <em>dịu dàng</em> đang chờ bạn.</> : <>Something <em>gentle</em> is waiting for you.</>}</h1>
          <p className="supporting">{t.intro}</p>
          <button className="primary-button" onClick={() => setStage("personalization")}>{t.open}<span aria-hidden="true">↗</span></button>
        </div>}
        {stage === "personalization" && <div className="story-content">
          <p className="overline">A FLOWER, JUST FOR YOU</p>
          <h1>{t.nameQuestion}</h1>
          <p className="supporting">{t.nameHelp}</p>
          <form onSubmit={submitName} noValidate>
            <label htmlFor="preferred-name" className="input-label">{t.namePlaceholder}</label>
            <input id="preferred-name" value={input} onChange={(event) => { setInput(event.target.value); setError(""); }} placeholder={t.namePlaceholder} autoComplete="nickname" aria-invalid={Boolean(error)} aria-describedby={error ? "name-error" : undefined} autoFocus />
            {error && <p id="name-error" className="field-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit">{t.bloom}<span aria-hidden="true">↗</span></button>
          </form>
          <button className="text-button" onClick={() => startBloom(null)}>{t.anonymous}</button>
        </div>}
        {stage === "blooming" && <div className="story-content blooming-content">
          <p className="overline">A FLOWER, JUST FOR YOU</p>
          <h1>{t.preparing}</h1>
          <button className="text-button skip-button" onClick={finish}>{t.skip}<span aria-hidden="true">→</span></button>
        </div>}
        {stage === "greeting" && <div className="story-content greeting-content">
          <p className="overline">A FLOWER, JUST FOR YOU</p>
          <h1 ref={headingRef} tabIndex={-1}>{name ? <><span className="recipient-name">{name},</span> {locale === "vi" ? "chúc bạn một ngày 20/10 thật dịu dàng." : "wishing you a gentle Vietnamese Women’s Day."}</> : t.genericHeading}</h1>
          <div className="letter"><span className="quote-mark" aria-hidden="true">“</span><p>{t.letter}</p><p className="signoff">{t.signoff}</p></div>
          <div className="greeting-actions"><button className="primary-button" onClick={replay}>{t.replay}<span aria-hidden="true">↺</span></button><button className="text-button" onClick={clearName}>{t.restart}</button></div>
        </div>}
        <div className="story-footer"><span>MADE TO BLOOM · 20.10</span><span className="footer-rule" /></div>
      </section>

      <section className="flower-panel" aria-label={t.flowerDescription}>
        <div className="flower-halo" aria-hidden="true" />
        <div className="flower-frame">
          {showStatic ? <StaticFlower open={isOpen} /> : <FlowerScene animating={stage === "blooming"} opened={isOpen} replayKey={replayKey} onSettled={finish} onFailure={() => { setWebglFailed(true); if (stage === "blooming") finish(); }} />}
          <img className={`rose-photo ${stage === "greeting" ? "is-visible" : ""}`} src="fuchsia-roses.png" alt="" aria-hidden="true" width="1024" height="1536" decoding="async" />
        </div>
        <div className="flower-caption"><span className="caption-line" /><span>01 / 01</span><span className="caption-name">ROSES IN BLOOM</span></div>
        <button className="mode-button" onClick={() => setStaticMode((value) => !value)} disabled={reducedMotion || webglFailed} aria-label={showStatic ? t.animated : t.static}>{showStatic ? t.animated : t.static}</button>
        {(reducedMotion || webglFailed) && <p className="mode-note">{t.reduced}</p>}
      </section>
    </div>
  </main>;
}
