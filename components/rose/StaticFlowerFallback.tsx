import { flowerCatalog, type FlowerKind } from "@/lib/flower-catalog";

export function StaticFlowerFallback({ kind, open }: { kind: FlowerKind; open: boolean }) {
  if (kind === "rose") return <div className="static-rose-fallback" aria-hidden="true"><img src={open ? "rose-bloom.webp" : "rose-bud-reference.png"} alt="" /></div>;
  const colors = flowerCatalog[kind];
  const count = kind === "peony" || kind === "peach-rose" ? 11 : kind === "lily" || kind === "alstroemeria" ? 6 : 5;
  const flower = (x: number, y: number, scale: number) => <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {open ? <>
      {Array.from({ length: count }, (_, index) => <path key={index} d={kind === "lily" || kind === "alstroemeria" ? "M0 0 C-14-25-28-95 0-118 C28-95 14-25 0 0Z" : "M0 0 C-56-30-76-90-42-115 C-22-132 18-122 38-106 C72-68 38-24 0 0Z"} transform={`rotate(${index * 360 / count})`} fill="url(#petal)" stroke={colors.shade} strokeOpacity=".25" strokeWidth="1.5" />)}
      {(kind === "peony" || kind === "peach-rose") && Array.from({ length: 7 }, (_, index) => <path key={`inner-${index}`} d="M0 0 C-26-28-35-58-12-72 C9-78 29-52 0 0Z" transform={`rotate(${index * 360 / 7 + 15})`} fill={colors.light} stroke={colors.shade} strokeOpacity=".4" />)}
      <circle r={kind === "peony" || kind === "peach-rose" ? 11 : 15} fill={colors.center} />
      {Array.from({ length: kind === "lily" || kind === "alstroemeria" ? 6 : 5 }, (_, index) => <g key={`stamen-${index}`} transform={`rotate(${index * 360 / (kind === "lily" || kind === "alstroemeria" ? 6 : 5)})`}><path d="M0 0 L0 -26" stroke={colors.center} strokeWidth="2"/><ellipse cy="-27" rx="3" ry="5" fill={colors.shade}/></g>)}
    </> : <>
      <path d="M0 0 C-45-50-38-135 0-147 C38-135 45-50 0 0Z" fill="url(#petal)" stroke={colors.shade} strokeOpacity=".35" strokeWidth="2" />
      <path d="M0 0 C-37-42-28-116 5-135 C4-88 25-44 0 0Z" fill={colors.light} opacity=".57" />
      {[-1, 1].map((side) => <path key={side} d={`M0 0 Q${side * 64} -48 ${side * 42} -122 Q${side * 36} -53 0 0Z`} fill="#4d7a2a" stroke="#91ae5f" strokeWidth="1.5" />)}
    </>}
  </g>;
  return <div className="static-rose-fallback" aria-hidden="true"><svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" role="presentation">
    <defs><linearGradient id="petal" x1="0" y1="0" x2="1" y2="1"><stop stopColor={colors.light} /><stop offset=".55" stopColor={colors.petal} /><stop offset="1" stopColor={colors.shade} /></linearGradient><linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#719c43"/><stop offset="1" stopColor="#1c4c1e"/></linearGradient></defs>
    <path d="M346 505 C333 390 383 292 375 185 M211 535 C208 421 200 363 236 305" fill="none" stroke="#507732" strokeWidth="8" strokeLinecap="round" />
    {[[330,430,-1],[355,352,1],[222,440,-1],[230,371,1]].map(([x,y,side], index) => <path key={index} d={`M${x} ${y} C${x+side*46} ${y-65} ${x+side*108} ${y-75} ${x+side*115} ${y-98} C${x+side*92} ${y-24} ${x+side*34} ${y+6} ${x} ${y}Z`} fill="url(#leaf)" stroke="#88a857" strokeWidth="2"/>)}
    {flower(375, 185, 1.18)}{flower(236, 305, 0.82)}
  </svg></div>;
}
