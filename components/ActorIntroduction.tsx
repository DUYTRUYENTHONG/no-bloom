"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Locale } from "@/lib/content";

/** A finite, compositor-only 2.5D greeting. No audio, AI call or render loop. */
export function ActorIntroduction({ stage, dock, onActiveChange }: {
  locale: Locale; stage: string; dock: RefObject<HTMLButtonElement | null>; onActiveChange: (active: boolean) => void;
}) {
  const [active, setActive] = useState(false);
  const figure = useRef<HTMLImageElement>(null);
  const completed = useRef(false);

  useEffect(() => {
    if (completed.current || stage !== "invitation") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || !Element.prototype.animate) { completed.current = true; return; }
    let disposed = false;
    let animation: Animation | undefined;
    let started = false;
    let loadingTimer = 0;
    const finish = () => {
      if (disposed || completed.current) return;
      completed.current = true;
      animation?.cancel();
      clearTimeout(loadingTimer);
      setActive(false); onActiveChange(false);
    };
    const start = () => {
      if (disposed || started || document.hidden || !figure.current) return;
      started = true; clearTimeout(loadingTimer);
      const w = innerWidth, h = innerHeight;
      const width = Math.min(220, w * .48, h * .5 * 112 / 145);
      const height = width * 145 / 112;
      const landingX = Math.max(12, (w - width) * .18);
      const landingY = Math.max(16, h - height - Math.min(90, h * .12));
      const offerX = (w - width) / 2;
      const offerY = Math.max(48, (h - height) * .45);
      const target = dock.current?.getBoundingClientRect();
      const transform = (x: number, y: number, scale = 1, rotation = 0, squash = 1) => `translate3d(${x}px,${y}px,0) rotate(${rotation}deg) scale(${scale},${scale * squash})`;
      figure.current.style.width = `${width}px`;
      figure.current.style.height = `${height}px`;
      setActive(true); onActiveChange(true);
      animation = figure.current.animate([
        { offset: 0, opacity: 0, transform: transform(-width - 20, landingY + 30, .86, -14) },
        { offset: .08, opacity: 1, transform: transform(-width * .3, landingY - 60, .96, -8), easing: "cubic-bezier(.25,.05,.7,1)" },
        { offset: .2, opacity: 1, transform: transform(landingX, landingY - 90, 1, 5), easing: "cubic-bezier(.4,0,.85,.6)" },
        { offset: .3, transform: transform(landingX, landingY, 1.03, 0, .95), easing: "ease-out" },
        { offset: .36, transform: transform(landingX, landingY, 1), easing: "cubic-bezier(.2,.7,.2,1)" },
        { offset: .58, transform: transform(offerX, offerY, 1.2), easing: "ease-out" },
        { offset: .8, opacity: 1, transform: transform(offerX, offerY, 1.2), easing: "cubic-bezier(.4,0,.3,1)" },
        { offset: .97, opacity: 1, transform: transform(target?.left ?? w - width, target?.top ?? landingY, (target?.width ?? width) / width) },
        { offset: 1, opacity: 0, transform: transform(target?.left ?? w - width, target?.top ?? landingY, (target?.width ?? width) / width) },
      ], { duration: 4000, fill: "both", easing: "linear" });
      animation.onfinish = finish;
    };
    const visibility = () => {
      if (!started) { if (!document.hidden) start(); return; }
      if (document.hidden) animation?.pause(); else animation?.play();
    };
    const interrupt = (event: Event) => { if (!(event.target instanceof Element) || !event.target.closest(".actor-introduction")) finish(); };
    const motionChange = () => { if (reduced.matches) finish(); };
    const key = (event: KeyboardEvent) => {
      if (["Escape", "Tab", "Enter"].includes(event.key)) finish();
      if (event.key === "Escape") dock.current?.focus({ preventScroll: true });
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerdown", interrupt, { capture: true });
    document.addEventListener("keydown", key);
    window.addEventListener("resize", finish, { once: true });
    window.addEventListener("scroll", finish, { once: true, passive: true });
    reduced.addEventListener("change", motionChange);
    loadingTimer = window.setTimeout(finish, 1200);
    figure.current?.decode().then(start).catch(finish);
    return () => {
      disposed = true; clearTimeout(loadingTimer); animation?.cancel(); onActiveChange(false);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerdown", interrupt, { capture: true });
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", finish); window.removeEventListener("scroll", finish);
      reduced.removeEventListener("change", motionChange);
    };
  }, [stage, dock, onActiveChange]);

  return <div className={`actor-introduction ${active ? "is-active" : ""}`} data-active={active}>
    <img ref={figure} src="guide-avatar.webp" width="112" height="145" decoding="async" alt="" aria-hidden="true" />
  </div>;
}
