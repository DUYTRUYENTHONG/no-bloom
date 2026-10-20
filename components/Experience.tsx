"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copy, type Locale } from "@/lib/content";
import { createBotanicalResponse, type BotanicalState } from "@/lib/botanical-ui";
import { validateName } from "@/lib/name";
import { FloralGreeting } from "./FloralGreeting";
import { RoseBloom } from "./RoseBloom";
import { AnalyticsPreference } from "./AnalyticsPreference";
import { flowerCatalog, flowerKinds, type FlowerKind } from "@/lib/flower-catalog";
import { VisitorCounter } from "./VisitorCounter";
import { readGiftLink } from "@/lib/gift-link";
import { FlowerGuide } from "./FlowerGuide";

type Stage = "invitation" | "personalization" | "blooming" | "greeting" | "withering";

export function Experience() {
  const [locale, setLocale] = useState<Locale>("vi");
  const [stage, setStage] = useState<Stage>("invitation");
  const [input, setInput] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [nameIssue, setNameIssue] = useState<"required" | "long" | null>(null);
  const [staticMode, setStaticMode] = useState(false);
  const [flower, setFlower] = useState<FlowerKind>("rose");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const markSceneUnavailable = useCallback(() => setSceneUnavailable(true), []);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingAction = useRef<"replay" | "restart" | null>(null);
  const t = copy[locale];
  const error = nameIssue === "required" ? t.nameError : nameIssue === "long" ? t.nameLong : "";
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const botanicalState: BotanicalState = error ? "WITHER_RELOAD" : stage === "invitation" ? "BUD" : stage === "personalization" ? "SPROUT" : stage === "blooming" ? "BLOOMING" : stage === "withering" ? "WITHER_RELOAD" : "FULL_BLOOM";
  const payload = createBotanicalResponse(botanicalState, locale, name, flower);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("no-bloom:a2ui", { detail: payload }));
  }, [payload.botanicalState, payload.componentSpec.props.data.locale, payload.componentSpec.props.data.recipient, payload.componentSpec.props.data.flower, staticMode, reducedMotion]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReducedMotion(query.matches); if (query.matches) setStaticMode(true); };
    update(); query.addEventListener("change", update);
    const linked = readGiftLink(new URL(window.location.href));
    if (linked) {
      setInput(linked.name);
      setName(linked.name);
      setFlower(linked.flower);
      setStage("blooming");
    } else {
      try { const saved = sessionStorage.getItem("no-bloom-name"); if (saved) setInput(saved); } catch { /* storage unavailable */ }
    }
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (stage === "greeting") headingRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const finish = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setStage("greeting");
  }, []);

  function startBloom(selectedName: string | null) {
    window.scrollTo({ top: 0, behavior: staticMode || reducedMotion ? "instant" : "smooth" });
    setName(selectedName);
    setNameIssue(null);
    setPaused(false);
    setStage("blooming");
  }

  function submitName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateName(input);
    if (!result.valid) { setNameIssue(result.tooLong ? "long" : "required"); return; }
    try { sessionStorage.setItem("no-bloom-name", result.value); } catch { /* storage unavailable */ }
    startBloom(result.value);
  }

  function replay() { beginWither("replay"); }
  function beginWither(action: "replay" | "restart") {
    window.scrollTo({ top: 0, behavior: staticMode || reducedMotion ? "instant" : "smooth" });
    pendingAction.current = action;
    setStage("withering");
  }
  function finishWither() {
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action === "replay") startBloom(name);
    else if (action === "restart") clearName();
  }
  function clearName() {
    setInput(""); setName(null); setNameIssue(null); setStage("personalization");
    try { sessionStorage.removeItem("no-bloom-name"); } catch { /* storage unavailable */ }
    const url = new URL(window.location.href);
    if (url.searchParams.has("for")) { url.searchParams.delete("for"); url.searchParams.delete("flower"); window.history.replaceState(null, "", url); }
  }

  const showStatic = staticMode || reducedMotion;

  return <main className={`experience stage-${stage}`} data-botanical-state={botanicalState} data-ui-component={payload.componentSpec.name}>
    <div className="page-wash" aria-hidden="true" />
    <header className="site-header">
      <div className="brand" aria-label="NỞ">NỞ<span className="brand-mark">✳</span></div>
      <div className="header-actions">
        <AnalyticsPreference locale={locale} />
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
          <div className="flower-choice"><label htmlFor="flower-kind">{locale === "vi" ? "Chọn loài hoa của bạn" : "Choose your flower"}</label><select id="flower-kind" value={flower} onChange={(event) => setFlower(event.target.value as FlowerKind)}>{flowerKinds.map((kind) => <option key={kind} value={kind}>{flowerCatalog[kind][locale]}</option>)}</select></div>
          <form onSubmit={submitName} noValidate>
            <label htmlFor="preferred-name" className="input-label">{t.namePlaceholder}</label>
            <input id="preferred-name" value={input} onChange={(event) => { setInput(event.target.value); setNameIssue(null); }} placeholder={t.namePlaceholder} autoComplete="name" aria-invalid={Boolean(error)} aria-describedby={error ? "name-error" : undefined} autoFocus />
            {error && <p id="name-error" className="field-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit">{t.bloom}<span aria-hidden="true">↗</span></button>
          </form>
          <button className="text-button" onClick={() => startBloom(null)}>{t.anonymous}</button>
        </div>}
        {stage === "blooming" && <div className="story-content blooming-content">
          <p className="overline">A FLOWER, JUST FOR YOU</p>
          <h1>{t.preparing}</h1>
          <p className="visually-hidden">{payload.componentSpec.props.data.message}</p>
          <button className="text-button skip-button" onClick={finish}>{t.skip}<span aria-hidden="true">→</span></button>
          {!showStatic && !sceneUnavailable && <button className="text-button pause-button" onClick={() => setPaused((value) => !value)}>{paused ? t.resume : t.pause}</button>}
        </div>}
        {stage === "greeting" && <FloralGreeting payload={payload} ref={headingRef} onReplay={replay} onRestart={() => beginWither("restart")} />}
        {stage === "withering" && <div className="story-content blooming-content" aria-hidden="true"><p className="overline">A FLOWER, JUST FOR YOU</p><h1>{t.preparing}</h1></div>}
        <div className="story-footer"><span>MADE TO BLOOM · 20.10</span><span className="footer-rule" /></div>
      </section>

      <section className="flower-panel" aria-label={locale === "vi" ? flowerCatalog[flower].descriptionVi : flowerCatalog[flower].descriptionEn}>
        <div className="flower-halo" aria-hidden="true" />
        <div className="flower-frame">
          <RoseBloom stage={stage} kind={flower} locale={locale} paused={paused} motionEnabled={!showStatic} onComplete={finish} onClosed={finishWither} onUnavailable={markSceneUnavailable} />
        </div>
        <div className="flower-caption"><span className="caption-line" /><span>{String(flowerKinds.indexOf(flower) + 1).padStart(2, "0")} / {String(flowerKinds.length).padStart(2, "0")}</span><span className="caption-name">{flowerCatalog[flower].caption}</span></div>
        <button className="mode-button" onClick={() => setStaticMode((value) => !value)} disabled={reducedMotion || sceneUnavailable} aria-label={sceneUnavailable ? t.sceneUnavailable : showStatic ? t.animated : t.static}>{sceneUnavailable ? t.sceneUnavailable : showStatic ? t.animated : t.static}</button>
        {reducedMotion && <p className="mode-note">{t.reduced}</p>}
        <VisitorCounter locale={locale} />
      </section>
    </div>
    <FlowerGuide locale={locale} stage={stage} />
  </main>;
}
