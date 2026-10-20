"use client";

import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import type { Locale } from "@/lib/content";
import styles from "./GreetingCelebration.module.css";

const particleColors = ["#d2e87b", "#f04498", "#f2c86f", "#e2b2c1", "#f7f4e7", "#91b85c"];
const particleCount = 42;

type ParticleStyle = CSSProperties & {
  "--particle-x": string;
  "--particle-drift": string;
  "--particle-delay": string;
  "--particle-duration": string;
  "--particle-size": string;
  "--particle-color": string;
  "--particle-turn": string;
};

function particleStyle(index: number): ParticleStyle {
  const fromLeft = index % 2 === 0;
  const laneOffset = (index % 3) * 0.75;
  const edgeX = fromLeft ? laneOffset : 98.5 + laneOffset;
  return {
    "--particle-x": `${edgeX}%`,
    "--particle-drift": `${fromLeft ? -3 - (index % 7) : 3 + (index % 7)}px`,
    "--particle-delay": `${(index % 10) * 55}ms`,
    "--particle-duration": `${1750 + (index % 7) * 130}ms`,
    "--particle-size": `${5 + (index % 4) * 2}px`,
    "--particle-color": particleColors[index % particleColors.length],
    "--particle-turn": `${120 + (index % 5) * 75}deg`,
  };
}

export function GreetingCelebration({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [showParticles, setShowParticles] = useState(false);
  const vi = locale === "vi";

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    const start = () => {
      window.clearTimeout(timer);
      if (motion.matches) {
        setShowParticles(false);
        return;
      }
      setShowParticles(true);
      timer = window.setTimeout(() => setShowParticles(false), 3200);
    };
    start();
    motion.addEventListener("change", start);
    return () => {
      window.clearTimeout(timer);
      motion.removeEventListener("change", start);
    };
  }, []);

  return <section className={styles.celebration} aria-label={vi ? "Một lời khen dành cho bạn" : "A compliment for you"}>
    {showParticles && <div className={styles.particles} aria-hidden="true">
      {Array.from({ length: particleCount }, (_, index) => <span key={index} className={styles.particle} data-celebration-particle style={particleStyle(index)} />)}
    </div>}
    <div className={styles.content} data-celebration-card>{children}</div>
  </section>;
}
