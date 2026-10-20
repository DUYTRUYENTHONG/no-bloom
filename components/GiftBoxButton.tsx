"use client";

import { useEffect, useRef, useState } from "react";

/** Original CSS artwork; the reference stock image is not shipped. */
export function GiftBoxButton({ label, onOpen }: { label: string; onOpen: () => void }) {
  const [opening, setOpening] = useState(false);
  const committed = useRef(false);
  const callback = useRef(onOpen);
  callback.current = onOpen;
  function complete() {
    if (committed.current) return;
    committed.current = true;
    callback.current();
  }
  useEffect(() => {
    if (!opening) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { if (reduced.matches) complete(); };
    reduced.addEventListener("change", change);
    // Finite fallback if CSS animations are unavailable or an end event is lost.
    const timer = window.setTimeout(complete, 1000);
    return () => { clearTimeout(timer); reduced.removeEventListener("change", change); };
  }, [opening]);
  return <button className={`gift-box-button ${opening ? "is-opening" : ""}`} type="button" aria-label={label} aria-busy={opening} disabled={opening} onClick={() => {
    if (opening || committed.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) complete(); else setOpening(true);
  }}>
    <span className="gift-visual" aria-hidden="true">
      <span className="gift-ground" />
      <span className="gift-object">
        <span className="gift-card"><svg viewBox="0 0 64 64" fill="none"><path d="M32 47C4 31 13 12 27 25C24 3 45 6 39 26C58 13 64 35 32 47Z" fill="#d42a88"/><path d="M32 43V59M32 54Q16 41 14 48Q19 59 32 56" stroke="#38652a" strokeWidth="3" strokeLinecap="round"/></svg></span>
        <span className="gift-body"><span className="gift-ribbon" /></span>
        <span className="gift-lid" onAnimationEnd={(event) => { if (event.animationName === "gift-lid-open") complete(); }}><span className="gift-ribbon" /><span className="gift-bow gift-bow-left"/><span className="gift-bow gift-bow-right"/><span className="gift-knot"/></span>
      </span>
    </span>
    <span className="gift-box-label">{label}<span aria-hidden="true">↗</span></span>
  </button>;
}
