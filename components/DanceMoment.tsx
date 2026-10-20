"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/content";

type Player = { destroy: () => void; pauseVideo: () => void };
type PlayerOptions = { events: { onReady: () => void; onStateChange: (event: { data: number }) => void; onError: () => void } };
declare global {
  interface Window { YT?: { Player: new (element: HTMLIFrameElement, options: PlayerOptions) => Player }; onYouTubeIframeAPIReady?: () => void; }
}
let apiPromise: Promise<void> | null = null;
function loadPlayerApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const previous = window.onYouTubeIframeAPIReady;
    const finish = () => { clearTimeout(timeout); resolve(); previous?.(); };
    const fail = () => { clearTimeout(timeout); script.remove(); if (window.onYouTubeIframeAPIReady === finish) window.onYouTubeIframeAPIReady = previous; apiPromise = null; reject(new Error("YouTube unavailable")); };
    const timeout = window.setTimeout(fail, 8000);
    window.onYouTubeIframeAPIReady = finish;
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function DanceMoment({ locale, onPlayingChange }: { locale: Locale; onPlayingChange: (playing: boolean) => void }) {
  const vi = locale === "vi";
  const [mode, setMode] = useState<"idle" | "silent" | "youtube">("idle");
  const [origin, setOrigin] = useState("");
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [appreciated, setAppreciated] = useState(false);
  const section = useRef<HTMLElement>(null);
  const focusMode = useRef(false);
  const lastStart = useRef("silent");
  useEffect(() => { if (!focusMode.current) return; focusMode.current = false; section.current?.querySelector<HTMLButtonElement>(mode === "idle" ? `[data-start="${lastStart.current}"]` : ".dance-stop")?.focus(); }, [mode]);
  function start(mode: "silent" | "youtube") { lastStart.current = mode; focusMode.current = true; setMode(mode); }
  const iframe = useRef<HTMLIFrameElement>(null);
  const player = useRef<Player | null>(null);
  useEffect(() => { onPlayingChange(playing); if (playing) setAppreciated(true); }, [playing, onPlayingChange]);
  useEffect(() => {
    if (mode !== "silent") return;
    setPlaying(true);
    const timer = window.setTimeout(() => { setPlaying(false); setMode("idle"); }, 7000);
    return () => clearTimeout(timer);
  }, [mode]);
  useEffect(() => {
    if (mode !== "youtube") return;
    let cancelled = false;
    let readinessTimer = 0;
    let broken = false;
    const fail = () => { if (cancelled || broken) return; broken = true; clearTimeout(readinessTimer); player.current?.pauseVideo(); player.current?.destroy(); player.current = null; setReady(false); setFailed(true); setPlaying(false); };
    loadPlayerApi().then(() => {
      if (cancelled || !iframe.current || !window.YT) return;
      player.current = new window.YT.Player(iframe.current, { events: {
        onReady: () => { clearTimeout(readinessTimer); if (!cancelled && !broken) setReady(true); },
        onStateChange: ({ data }) => { if (!cancelled && !broken) { setPlaying(data === 1 && !document.hidden); if (data === 1 && document.hidden) player.current?.pauseVideo(); } },
        onError: fail,
      } });
      readinessTimer = window.setTimeout(fail, 8000);
    }).catch(fail);
    return () => { cancelled = true; clearTimeout(readinessTimer); player.current?.destroy(); player.current = null; onPlayingChange(false); };
  }, [mode, onPlayingChange]);
  useEffect(() => {
    const hide = () => { if (document.hidden) { player.current?.pauseVideo(); setPlaying(false); if (mode === "silent") setMode("idle"); } };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [mode]);
  useEffect(() => () => onPlayingChange(false), [onPlayingChange]);

  function stop() { focusMode.current = true; player.current?.pauseVideo(); setPlaying(false); setMode("idle"); }
  function enableMusic() { setOrigin(window.location.origin); setFailed(false); setReady(false); setPlaying(false); start("youtube"); }
  return <section ref={section} className="dance-moment" aria-label={vi ? "Một chút vui dành cho bạn" : "A little joy for you"}>
    <p className="dance-invite">{vi ? "Một chút vui dành cho bạn?" : "A little joy, just for you?"}</p>
    {mode === "idle" && <>
      <div className="dance-actions"><button type="button" data-start="silent" onClick={() => start("silent")}>{vi ? "Nhảy không nhạc" : "Dance without music"}</button><button type="button" data-start="youtube" onClick={enableMusic}>{vi ? "Mở bài hát & nhảy" : "Open song & dance"}</button></div>
      <p className="guide-disclosure">{vi ? "Bài hát mở qua YouTube khi bạn chọn. YouTube xử lý dữ liệu theo chính sách của họ." : "The song loads from YouTube only when you choose it. YouTube processes data under its own policies."}</p>
    </>}
    {mode === "youtube" && <>
      <p className="song-credit">Girls Just Want to Have Fun · Cyndi Lauper</p>
      {!failed && <iframe ref={iframe} title="Cyndi Lauper — Girls Just Want to Have Fun, official YouTube video" width="320" height="200" referrerPolicy="origin" allow="encrypted-media; picture-in-picture" allowFullScreen src={`https://www.youtube-nocookie.com/embed/PIb6AZdTr-A?${new URLSearchParams({ enablejsapi: "1", origin, autoplay: "0", playsinline: "1", rel: "0" })}`} />}
      <p className="guide-disclosure" role="status">{failed ? (vi ? "YouTube chưa khả dụng. Bạn vẫn có thể nhảy không nhạc." : "YouTube is unavailable. You can still dance without music.") : ready ? (vi ? "Bấm phát trong trình phát để bắt đầu nhảy." : "Press play in the player to start the dance.") : (vi ? "Đang mở trình phát YouTube…" : "Opening the YouTube player…")}</p>
      <a href="https://www.youtube.com/watch?v=PIb6AZdTr-A" target="_blank" rel="noopener noreferrer">{vi ? "Xem video chính thức trên YouTube" : "Watch the official video on YouTube"}</a>
      {failed && <button className="dance-stop" type="button" data-start="silent" onClick={() => start("silent")}>{vi ? "Nhảy không nhạc" : "Dance without music"}</button>}
    </>}
    {appreciated && <p className="guide-compliment" role="status">{vi ? "Chúc bạn có thật nhiều niềm vui, được tự do làm điều mình yêu thích và luôn được trân trọng. Hôm nay là một dịp nhỏ để dành cho bạn một điều thật đẹp." : "May there be plenty of joy, freedom to do what you love, and appreciation in your day. This is a little moment of celebration, just for you."}</p>}
    {mode !== "idle" && <button className="dance-stop" type="button" onClick={stop}>{vi ? "Dừng nhạc & điệu nhảy" : "Stop music & dance"}</button>}
  </section>;
}
