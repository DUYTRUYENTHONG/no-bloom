"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copy, type Locale } from "@/lib/content";
import { createBotanicalResponse, type BotanicalState } from "@/lib/botanical-ui";
import { validateName } from "@/lib/name";
import { FloralGreeting } from "./FloralGreeting";
import { RoseBloom } from "./RoseBloom";

type Stage = "invitation" | "personalization" | "blooming" | "greeting" | "withering";

export function Experience() {
  const [locale, setLocale] = useState<Locale>("vi");
  const [stage, setStage] = useState<Stage>("invitation");
  const [input, setInput] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [staticMode, setStaticMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAction = useRef<"replay" | "restart" | null>(null);
  const t = copy[locale];
  const botanicalState: BotanicalState = error ? "WITHER_RELOAD" : stage === "invitation" ? "BUD" : stage === "personalization" ? "SPROUT" : stage === "blooming" ? "BLOOMING" : stage === "withering" ? "WITHER_RELOAD" : "FULL_BLOOM";
  const payload = createBotanicalResponse(botanicalState, locale, name);
  const bloomDurationMs = createBotanicalResponse("BLOOMING", locale, name).animationConfig.transitionDurationMs;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("no-bloom:a2ui", { detail: payload }));
  }, [payload.botanicalState, payload.componentSpec.props.data.locale, payload.componentSpec.props.data.recipient, staticMode, reducedMotion]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReducedMotion(query.matches); if (query.matches) setStaticMode(true); };
    update(); query.addEventListener("change", update);
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
    if (timer.current) clearTimeout(timer.current);
    setName(selectedName);
    setError("");
    setStage("blooming");
    if (staticMode || reducedMotion) timer.current = setTimeout(finish, 250);
    else timer.current = setTimeout(finish, bloomDurationMs);
  }

  function submitName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateName(input);
    if (!result.valid) { setError(result.tooLong ? t.nameLong : t.nameError); return; }
    try { sessionStorage.setItem("no-bloom-name", result.value); } catch { /* storage unavailable */ }
    startBloom(result.value);
  }

  function replay() { beginWither("replay"); }
  function beginWither(action: "replay" | "restart") {
    if (timer.current) clearTimeout(timer.current);
    pendingAction.current = action;
    setStage("withering");
    if (staticMode || reducedMotion) timer.current = setTimeout(finishWither, 0);
    else timer.current = setTimeout(finishWither, 450);
  }
  function finishWither() {
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action === "replay") startBloom(name);
    else if (action === "restart") clearName();
  }
  function clearName() {
    setInput(""); setName(null); setError(""); setStage("personalization");
    try { sessionStorage.removeItem("no-bloom-name"); } catch { /* storage unavailable */ }
  }

  const showStatic = staticMode || reducedMotion;

  return <main className={`experience stage-${stage}`} data-botanical-state={botanicalState} data-ui-component={payload.componentSpec.name}>
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
        {stage === "greeting" && <FloralGreeting payload={payload} ref={headingRef} onReplay={replay} onRestart={() => beginWither("restart")} />}
        {stage === "withering" && <div className="story-content blooming-content" aria-hidden="true"><p className="overline">A FLOWER, JUST FOR YOU</p><h1>{t.preparing}</h1></div>}
        <div className="story-footer"><span>MADE TO BLOOM · 20.10</span><span className="footer-rule" /></div>
      </section>

      <section className="flower-panel" aria-label={t.flowerDescription}>
        <div className="flower-halo" aria-hidden="true" />
        <div className="flower-frame">
          <RoseBloom stage={stage} motionEnabled={!showStatic} durationMs={bloomDurationMs} />
        </div>
        <div className="flower-caption"><span className="caption-line" /><span>01 / 01</span><span className="caption-name">ROSES IN BLOOM</span></div>
        <button className="mode-button" onClick={() => setStaticMode((value) => !value)} disabled={reducedMotion} aria-label={showStatic ? t.animated : t.static}>{showStatic ? t.animated : t.static}</button>
        {reducedMotion && <p className="mode-note">{t.reduced}</p>}
      </section>
    </div>
  </main>;
}
