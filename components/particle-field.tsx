"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
  phase: number;
  accent: boolean;
};

export type ParticleFieldProps = {
  className?: string;
  style?: CSSProperties;
  /** Approximate number of CSS pixels represented by one particle. */
  density?: number;
  maxParticles?: number;
  connectionDistance?: number;
  interactionRadius?: number;
  speed?: number;
  interactive?: boolean;
};

const TAU = Math.PI * 2;

function createRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function readColor(element: HTMLElement, property: string, fallback: string) {
  const value = window.getComputedStyle(element).getPropertyValue(property).trim();
  return value || fallback;
}

/**
 * A decorative, container-sized light field. Its canvas never captures pointer
 * events, so it is safe to place behind real controls and links.
 */
export function ParticleField({
  className,
  style,
  density = 15_000,
  maxParticles = 64,
  connectionDistance = 116,
  interactionRadius = 150,
  speed = 0.28,
  interactive = true
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = performance.now();
    let visible = true;
    let pageVisible = document.visibilityState === "visible";
    let reduceMotion = reducedMotionQuery.matches;
    let coarsePointer = coarsePointerQuery.matches;
    let bounds = canvas.getBoundingClientRect();
    let particleColor = "rgba(91, 79, 207, 0.72)";
    let accentColor = "rgba(14, 165, 233, 0.62)";
    let pointerColor = "rgba(217, 70, 239, 0.18)";
    const pointer = { x: 0, y: 0, active: false };

    const refreshPalette = () => {
      particleColor = readColor(canvas, "--particle-color", "rgba(91, 79, 207, 0.72)");
      accentColor = readColor(canvas, "--particle-accent", "rgba(14, 165, 233, 0.62)");
      pointerColor = readColor(canvas, "--particle-pointer", "rgba(217, 70, 239, 0.18)");
    };

    const seedParticles = () => {
      const area = width * height;
      const pointerFactor = coarsePointer ? 0.58 : 1;
      const count = Math.min(
        maxParticles,
        Math.max(12, Math.round((area / Math.max(1, density)) * pointerFactor))
      );
      const random = createRandom(Math.round(width * 31 + height * 17 + count));

      particles = Array.from({ length: count }, (_, index) => {
        const angle = random() * TAU;
        const velocity = speed * (0.45 + random() * 0.75);
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        return {
          x: random() * width,
          y: random() * height,
          vx,
          vy,
          baseVx: vx,
          baseVy: vy,
          radius: 0.75 + random() * 1.45,
          phase: random() * TAU,
          accent: index % 5 === 0
        };
      });
    };

    const draw = (time: number, advance: boolean) => {
      context.clearRect(0, 0, width, height);

      if (pointer.active && !reduceMotion && !coarsePointer) {
        const glow = context.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          interactionRadius * 1.25
        );
        glow.addColorStop(0, pointerColor);
        glow.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);
      }

      const distanceLimitSquared = connectionDistance * connectionDistance;
      context.lineWidth = 0.7;

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        if (advance) {
          const delta = Math.min(2, Math.max(0.35, (time - lastFrame) / 16.667));
          particle.vx += (particle.baseVx - particle.vx) * 0.018 * delta;
          particle.vy += (particle.baseVy - particle.vy) * 0.018 * delta;

          if (pointer.active) {
            const dx = particle.x - pointer.x;
            const dy = particle.y - pointer.y;
            const distance = Math.hypot(dx, dy);

            if (distance > 0 && distance < interactionRadius) {
              const force = (1 - distance / interactionRadius) * 0.042 * delta;
              particle.vx += (dx / distance) * force;
              particle.vy += (dy / distance) * force;
            }
          }

          particle.x += particle.vx * delta;
          particle.y += particle.vy * delta;

          if (particle.x < -connectionDistance) particle.x = width + connectionDistance;
          if (particle.x > width + connectionDistance) particle.x = -connectionDistance;
          if (particle.y < -connectionDistance) particle.y = height + connectionDistance;
          if (particle.y > height + connectionDistance) particle.y = -connectionDistance;
        }

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const other = particles[nextIndex];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared < distanceLimitSquared) {
            const opacity = (1 - distanceSquared / distanceLimitSquared) * 0.18;
            context.globalAlpha = opacity;
            context.strokeStyle = particle.accent || other.accent ? accentColor : particleColor;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(other.x, other.y);
            context.stroke();
          }
        }
      }

      for (const particle of particles) {
        const pulse = reduceMotion ? 1 : 0.82 + Math.sin(time * 0.0012 + particle.phase) * 0.18;
        context.globalAlpha = pulse * (particle.accent ? 0.72 : 0.56);
        context.fillStyle = particle.accent ? accentColor : particleColor;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, TAU);
        context.fill();
      }

      context.globalAlpha = 1;
      lastFrame = time;
    };

    const animate = (time: number) => {
      frame = 0;
      if (!visible || !pageVisible) return;
      draw(time, !reduceMotion);
      if (!reduceMotion) frame = window.requestAnimationFrame(animate);
    };

    const schedule = () => {
      if (frame || !visible || !pageVisible) return;
      if (reduceMotion) draw(performance.now(), false);
      else frame = window.requestAnimationFrame(animate);
    };

    const resize = () => {
      bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      // Decorative canvases can inherit the height of a long landing page.
      // Keep their backing store bounded while retaining extra detail on
      // ordinary viewport-sized fields.
      const pixelBudgetRatio = Math.sqrt(4_000_000 / Math.max(1, width * height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.max(0.5, pixelBudgetRatio));
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      refreshPalette();
      seedParticles();
      schedule();
    };

    const updateBounds = () => {
      bounds = canvas.getBoundingClientRect();
      pointer.active = false;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!interactive || coarsePointer || reduceMotion) return;
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      pointer.active = x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height;
      pointer.x = x;
      pointer.y = y;
    };

    const handleMotionPreference = () => {
      reduceMotion = reducedMotionQuery.matches;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      schedule();
    };

    const handlePointerPreference = () => {
      coarsePointer = coarsePointerQuery.matches;
      pointer.active = false;
      seedParticles();
      schedule();
    };

    const handleVisibility = () => {
      pageVisible = document.visibilityState === "visible";
      if (!pageVisible && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      schedule();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      schedule();
    }, { rootMargin: "120px" });
    intersectionObserver.observe(canvas);

    const themeObserver = new MutationObserver(() => {
      refreshPalette();
      schedule();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"]
    });

    if (interactive) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("scroll", updateBounds, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotionQuery.addEventListener("change", handleMotionPreference);
    coarsePointerQuery.addEventListener("change", handlePointerPreference);
    resize();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      if (interactive) {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("scroll", updateBounds, { capture: true });
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotionQuery.removeEventListener("change", handleMotionPreference);
      coarsePointerQuery.removeEventListener("change", handlePointerPreference);
    };
  }, [connectionDistance, density, interactionRadius, interactive, maxParticles, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        ...style,
        pointerEvents: "none"
      }}
    />
  );
}
