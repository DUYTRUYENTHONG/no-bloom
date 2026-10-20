export function StaticFlower({ open = false }: { open?: boolean }) {
  return <svg className={`static-flower ${open ? "is-open" : ""}`} viewBox="0 0 500 560" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="petal" x1="0" y1="1" x2=".7" y2="0"><stop stopColor="#8c0b46" /><stop offset=".55" stopColor="#df2c82" /><stop offset="1" stopColor="#ff83b0" /></linearGradient>
      <linearGradient id="leaf" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#28430e" /><stop offset="1" stopColor="#8daa4c" /></linearGradient>
      <filter id="shadow"><feGaussianBlur stdDeviation="14" /></filter>
    </defs>
    <ellipse cx="250" cy="515" rx="115" ry="18" fill="#000000" opacity=".3" filter="url(#shadow)" />
    <path d="M250 280 C240 360 255 440 247 510" fill="none" stroke="#6e8c31" strokeWidth="8" strokeLinecap="round" />
    <path d="M246 422 C205 368 165 376 142 358 C163 412 204 432 246 422Z" fill="url(#leaf)" />
    <path d="M250 451 C284 395 326 410 353 382 C336 445 295 463 250 451Z" fill="url(#leaf)" />
    {open ? <g transform="translate(250 250)">
      {Array.from({ length: 10 }, (_, i) => <path key={`outer-${i}`} d="M0 13 C-61 -30 -86 -124 0 -140 C86 -124 61 -30 0 13Z" fill="url(#petal)" stroke="#ad5c79" strokeWidth="1.2" transform={`rotate(${i * 36})`} opacity=".94" />)}
      {Array.from({ length: 8 }, (_, i) => <path key={`inner-${i}`} d="M0 5 C-36 -28 -48 -89 0 -105 C48 -89 36 -28 0 5Z" fill="#ec5d9b" stroke="#b91962" strokeWidth="1" transform={`rotate(${i * 45 + 15})`} />)}
      <circle r="16" fill="#d5aa75" /><circle r="7" fill="#9c754c" />
    </g> : <g transform="translate(250 263)">
      <path d="M0 60 C-91 30 -73 -70 0 -115 C73 -70 91 30 0 60Z" fill="url(#petal)" stroke="#bd6784" strokeWidth="2" />
      <path d="M0 48 C-45 6 -30 -65 0 -109 C30 -65 45 6 0 48Z" fill="#f04b93" opacity=".8" />
      <path d="M-66 30 C-53 65 -22 74 0 63 C22 74 53 65 66 30" fill="none" stroke="#658a35" strokeWidth="9" strokeLinecap="round" />
    </g>}
  </svg>;
}
