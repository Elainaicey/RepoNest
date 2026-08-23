"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type PointerEvent
} from "react";

type SurfaceVariables = CSSProperties & Record<`--${string}`, string | number | undefined>;

export type InteractiveSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  maxTilt?: number;
  lift?: number;
  glowColor?: string;
  disabled?: boolean;
  clip?: boolean;
};

/**
 * Adds a restrained perspective tilt, cursor-following bloom, glass sheen and
 * hairline rim to any card-like content without making the wrapper itself an
 * extra keyboard stop.
 */
export const InteractiveSurface = forwardRef<HTMLDivElement, InteractiveSurfaceProps>(
  function InteractiveSurface(
    {
      children,
      className,
      style,
      maxTilt = 3.5,
      lift = 3,
      glowColor = "var(--accent-9, #6e56cf)",
      disabled = false,
      clip = true,
      onPointerEnter,
      onPointerMove,
      onPointerLeave,
      onFocusCapture,
      onBlurCapture,
      ...props
    },
    forwardedRef
  ) {
    const surfaceRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef(0);
    const effectEnabledRef = useRef(false);
    const focusWithinRef = useRef(false);
    const pendingPointerRef = useRef({ x: 0, y: 0 });

    useImperativeHandle(forwardedRef, () => surfaceRef.current as HTMLDivElement, []);

    useEffect(() => {
      const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const coarsePointerQuery = window.matchMedia("(pointer: coarse)");

      const updatePreference = () => {
        effectEnabledRef.current = !disabled && !reducedMotionQuery.matches && !coarsePointerQuery.matches;
        const surface = surfaceRef.current;
        if (!surface || effectEnabledRef.current) return;
        if (frameRef.current) {
          window.cancelAnimationFrame(frameRef.current);
          frameRef.current = 0;
        }
        surface.style.setProperty("--surface-tilt-x", "0deg");
        surface.style.setProperty("--surface-tilt-y", "0deg");
        surface.style.setProperty("--surface-lift", "0px");
        surface.style.setProperty("--surface-glow-opacity", focusWithinRef.current ? "0.35" : "0");
        surface.style.setProperty("--surface-sheen-opacity", "0");
      };

      updatePreference();
      reducedMotionQuery.addEventListener("change", updatePreference);
      coarsePointerQuery.addEventListener("change", updatePreference);

      return () => {
        if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
        reducedMotionQuery.removeEventListener("change", updatePreference);
        coarsePointerQuery.removeEventListener("change", updatePreference);
      };
    }, [disabled]);

    const reveal = () => {
      const surface = surfaceRef.current;
      if (!surface || !effectEnabledRef.current) return;
      surface.style.setProperty("--surface-glow-opacity", "1");
      surface.style.setProperty("--surface-sheen-opacity", "0.48");
      surface.style.setProperty("--surface-rim-opacity", "0.72");
      surface.style.setProperty("--surface-lift", `${-lift}px`);
    };

    const settle = () => {
      const surface = surfaceRef.current;
      if (!surface) return;
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      surface.style.setProperty("--surface-tilt-x", "0deg");
      surface.style.setProperty("--surface-tilt-y", "0deg");
      surface.style.setProperty("--surface-lift", "0px");
      surface.style.setProperty("--surface-glow-opacity", focusWithinRef.current ? "0.42" : "0");
      surface.style.setProperty("--surface-sheen-opacity", "0");
      surface.style.setProperty("--surface-rim-opacity", focusWithinRef.current ? "0.62" : "0.34");
    };

    const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
      reveal();
      onPointerEnter?.(event);
    };

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      if (!effectEnabledRef.current || event.pointerType === "touch") return;

      pendingPointerRef.current = { x: event.clientX, y: event.clientY };
      if (frameRef.current) return;

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = 0;
        const surface = surfaceRef.current;
        if (!surface) return;

        const bounds = surface.getBoundingClientRect();
        const xRatio = Math.min(1, Math.max(0, (pendingPointerRef.current.x - bounds.left) / bounds.width));
        const yRatio = Math.min(1, Math.max(0, (pendingPointerRef.current.y - bounds.top) / bounds.height));
        const tiltX = (0.5 - yRatio) * maxTilt * 2;
        const tiltY = (xRatio - 0.5) * maxTilt * 2;

        surface.style.setProperty("--surface-pointer-x", `${xRatio * 100}%`);
        surface.style.setProperty("--surface-pointer-y", `${yRatio * 100}%`);
        surface.style.setProperty("--surface-tilt-x", `${tiltX.toFixed(2)}deg`);
        surface.style.setProperty("--surface-tilt-y", `${tiltY.toFixed(2)}deg`);
        surface.style.setProperty("--surface-sheen-x", `${(xRatio - 0.5) * 30}%`);
        surface.style.setProperty("--surface-sheen-y", `${(yRatio - 0.5) * 22}%`);
      });
    };

    const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
      settle();
      onPointerLeave?.(event);
    };

    const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
      focusWithinRef.current = true;
      const surface = surfaceRef.current;
      if (surface) {
        surface.style.setProperty("--surface-glow-opacity", "0.42");
        surface.style.setProperty("--surface-sheen-opacity", "0");
        surface.style.setProperty("--surface-rim-opacity", "0.62");
      }
      onFocusCapture?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
      const nextFocus = event.relatedTarget;
      if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
        focusWithinRef.current = false;
        settle();
      }
      onBlurCapture?.(event);
    };

    const surfaceStyle: SurfaceVariables = {
      "--surface-pointer-x": "50%",
      "--surface-pointer-y": "50%",
      "--surface-tilt-x": "0deg",
      "--surface-tilt-y": "0deg",
      "--surface-lift": "0px",
      "--surface-glow-opacity": 0,
      "--surface-sheen-opacity": 0,
      "--surface-rim-opacity": 0.34,
      "--surface-sheen-x": "0%",
      "--surface-sheen-y": "0%",
      "--surface-glow-color": glowColor,
      position: "relative",
      isolation: "isolate",
      overflow: clip ? "clip" : undefined,
      transform:
        "perspective(900px) translate3d(0, var(--surface-lift), 0) rotateX(var(--surface-tilt-x)) rotateY(var(--surface-tilt-y))",
      transformStyle: "preserve-3d",
      transition: "transform 260ms cubic-bezier(.2,.8,.2,1)",
      ...style
    };

    return (
      <div
        {...props}
        ref={surfaceRef}
        className={className ? `interactive-surface ${className}` : "interactive-surface"}
        data-interactive-surface={disabled ? "disabled" : "enabled"}
        style={surfaceStyle}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
      >
        {children}
        <span
          className="interactive-surface__glow"
          aria-hidden="true"
          style={{
            position: "absolute",
            zIndex: 4,
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            opacity: "var(--surface-glow-opacity)",
            background:
              "radial-gradient(circle at var(--surface-pointer-x) var(--surface-pointer-y), color-mix(in srgb, var(--surface-glow-color) 22%, transparent) 0%, color-mix(in srgb, var(--surface-glow-color) 8%, transparent) 28%, transparent 68%)",
            transition: "opacity 220ms ease"
          }}
        />
        <span
          className="interactive-surface__sheen"
          aria-hidden="true"
          style={{
            position: "absolute",
            zIndex: 5,
            inset: "-36%",
            borderRadius: "inherit",
            pointerEvents: "none",
            opacity: "var(--surface-sheen-opacity)",
            background:
              "linear-gradient(112deg, transparent 34%, color-mix(in srgb, white 52%, transparent) 48%, transparent 62%)",
            transform: "translate3d(var(--surface-sheen-x), var(--surface-sheen-y), 0)",
            transition: "opacity 220ms ease, transform 120ms linear",
            mixBlendMode: "soft-light"
          }}
        />
        <span
          className="interactive-surface__rim"
          aria-hidden="true"
          style={{
            position: "absolute",
            zIndex: 6,
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            opacity: "var(--surface-rim-opacity)",
            boxShadow:
              "inset 0 0 0 1px color-mix(in srgb, white 58%, transparent), inset 0 1px 0 color-mix(in srgb, white 72%, transparent)",
            transition: "opacity 220ms ease"
          }}
        />
      </div>
    );
  }
);
