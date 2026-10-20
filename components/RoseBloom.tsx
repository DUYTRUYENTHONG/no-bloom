import type { CSSProperties } from "react";

type RoseBloomProps = {
  stage: "invitation" | "personalization" | "blooming" | "greeting" | "withering";
  motionEnabled: boolean;
  durationMs: number;
};

export function RoseBloom({ stage, motionEnabled, durationMs }: RoseBloomProps) {
  const style = { "--bloom-duration": `${durationMs}ms` } as CSSProperties;
  return <div className={`rose-bloom rose-bloom--${stage} ${motionEnabled ? "rose-bloom--motion" : "rose-bloom--still"}`} style={style} aria-hidden="true">
    <div className="rose-depth">
      <img className="rose-phase rose-phase--bud" src="rose-bud.webp" alt="" width="1024" height="1536" decoding="async" fetchPriority="high" />
      <img className="rose-phase rose-phase--opening" src="rose-opening.webp" alt="" width="1024" height="1536" decoding="async" />
      <img className="rose-phase rose-phase--bloom" src="rose-bloom.webp" alt="" width="1024" height="1536" decoding="async" />
    </div>
    <div className="rose-light" />
  </div>;
}
