export const bloomConfig = {
  durationMs: 7000,
  secondaryDelay: 0.085,
  seed: 2010,
  colors: {
    stage: "#071008",
    petal: "#D42A88",
    petalLight: "#F36DBB",
    petalShade: "#86164F",
    leaf: "#38652A",
    lime: "#B5D34B",
  },
  quality: {
    high: { rows: 12, columns: 10, dpr: 1.75 },
    balanced: { rows: 8, columns: 7, dpr: 1.35 },
  },
} as const;

export type BloomQuality = keyof typeof bloomConfig.quality;
