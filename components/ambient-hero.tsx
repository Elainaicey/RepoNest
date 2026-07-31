"use client";

import { useRef } from "react";

const particles = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 37) % 96}%`,
  top: `${(index * 61) % 92}%`,
  delay: `${(index % 7) * -0.8}s`,
  size: `${3 + (index % 4)}px`
}));

export function AmbientHero() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      className="ambient-hero"
      ref={ref}
      aria-hidden="true"
      onPointerMove={(event) => {
        const bounds = ref.current?.getBoundingClientRect();
        if (!bounds || !ref.current) return;
        ref.current.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
        ref.current.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
      }}
    >
      <div className="ambient-glow" />
      {particles.map((particle, index) => (
        <i key={index} style={{ left: particle.left, top: particle.top, animationDelay: particle.delay, width: particle.size, height: particle.size }} />
      ))}
    </div>
  );
}
