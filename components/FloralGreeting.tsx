import { forwardRef, useState } from "react";
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
  const [copyStatus, setCopyStatus] = useState("");
  async function copyPersonalLink() {
    if (!recipient) return;
    try {
      const link = createGiftLink(new URL(window.location.href), recipient, payload.componentSpec.props.data.flower);
      await navigator.clipboard.writeText(link);
      setCopyStatus(t.linkCopied);
    } catch { setCopyStatus(t.linkFailed); }
  }
  return <div className="story-content greeting-content">
    <p className="overline">A FLOWER, JUST FOR YOU</p>
    <h1 ref={ref} tabIndex={-1}>{recipient ? <><span className="recipient-name">{recipient},</span> {locale === "vi" ? "chúc bạn một ngày 20/10 thật dịu dàng." : "wishing you a gentle Vietnamese Women’s Day."}</> : t.genericHeading}</h1>
    <div className="letter"><span className="quote-mark" aria-hidden="true">“</span><p>{t.letter}</p><p className="signoff">{t.signoff}</p></div>
    <div className="greeting-actions"><button className="primary-button" onClick={onReplay}>{t.replay}<span aria-hidden="true">↺</span></button>{recipient && <button className="text-button" onClick={copyPersonalLink}>{t.shareLink}</button>}<button className="text-button" onClick={onRestart}>{t.restart}</button></div>
    <p className="copy-status" role="status">{copyStatus}</p>
  </div>;
});
