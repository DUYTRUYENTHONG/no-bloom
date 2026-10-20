import { forwardRef, useEffect, useRef, useState } from "react";
import { copy } from "@/lib/content";
import type { GenerativeUiResponse } from "@/lib/botanical-ui";
import { createGiftLink } from "@/lib/gift-link";

type Props = {
  payload: GenerativeUiResponse;
  onReplay: () => void;
  onRestart: () => void;
};

export const FloralGreeting = forwardRef<HTMLHeadingElement, Props>(function FloralGreeting({ payload, onReplay, onRestart }, ref) {
  const { locale, recipient } = payload.componentSpec.props.data;
  const t = copy[locale];
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | null>(null);
  const [manualLink, setManualLink] = useState("");
  const linkField = useRef<HTMLInputElement>(null);
  useEffect(() => { if (manualLink) { linkField.current?.focus(); linkField.current?.select(); } }, [manualLink]);
  async function copyPersonalLink() {
    if (!recipient) return;
    const link = createGiftLink(new URL(window.location.href), recipient, payload.componentSpec.props.data.flower);
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus("copied");
      setManualLink("");
    } catch { setCopyStatus("failed"); setManualLink(link); }
  }
  return <div className="story-content greeting-content">
    <p className="overline">A FLOWER, JUST FOR YOU</p>
    <h1 ref={ref} tabIndex={-1}>{recipient ? <><span className="recipient-name">{recipient},</span> {locale === "vi" ? "chúc bạn một ngày 20/10 thật dịu dàng." : "wishing you a gentle Vietnamese Women’s Day."}</> : t.genericHeading}</h1>
    <div className="letter"><span className="quote-mark" aria-hidden="true">“</span><p>{t.letter}</p><p className="signoff">{t.signoff}</p></div>
    <div className="greeting-actions"><button className="primary-button" onClick={onReplay}>{t.replay}<span aria-hidden="true">↺</span></button>{recipient && <button className="text-button" onClick={copyPersonalLink}>{t.shareLink}</button>}<button className="text-button" onClick={onRestart}>{t.restart}</button></div>
    <p className="copy-status" role="status">{copyStatus === "copied" ? t.linkCopied : copyStatus === "failed" ? t.linkFailed : ""}</p>
    {manualLink && <div className="manual-link"><label htmlFor="personal-link">{locale === "vi" ? "Chọn và sao chép liên kết này" : "Select and copy this link"}</label><input ref={linkField} id="personal-link" readOnly value={manualLink} onFocus={(event) => event.currentTarget.select()} /></div>}
  </div>;
});
