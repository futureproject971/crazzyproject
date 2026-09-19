import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";

/**
 * Pixel-rain layer for the whole site background.
 * Raindrops fall over the wallpaper; the mouse acts like an umbrella,
 * carving a dry dome that follows the cursor.
 * The rain color reacts to the theme: soft blue in dark mode, and a bright
 * NEON blue in light mode (otherwise it is invisible over the light wallpaper).
 * Purely decorative: pointer-events none, sits in the fixed .crazy-scene layer.
 */
export function RainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { resolvedTheme } = useTheme();

  // Style is read inside the animation loop via a ref, so switching theme
  // recolors the rain live without restarting the animation.
  const styleRef = useRef({
    line: "rgba(150,190,255,0.34)",
    dome: "rgba(150,190,255,0.12)",
    width: 1.2,
    glow: 0,
  });

  useEffect(() => {
    const dark = resolvedTheme === "dark";
    styleRef.current = dark
      ? { line: "rgba(150,190,255,0.34)", dome: "rgba(150,190,255,0.12)", width: 1.2, glow: 0 }
      : { line: "rgba(0,140,255,0.75)", dome: "rgba(0,140,255,0.30)", width: 1.5, glow: 6 };
  }, [resolvedTheme]);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const UMBRELLA = 96; // radius of the dry dome around the cursor
    const mouse = { x: -9999, y: -9999, active: false };

    type Drop = { x: number; y: number; len: number; speed: number };
    let drops: Drop[] = [];

    const makeDrop = (spread: boolean): Drop => ({
      x: Math.random() * width,
      y: spread ? Math.random() * height : -24,
      len: 7 + Math.random() * 13,
      speed: 3.4 + Math.random() * 4.6,
    });

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      if (!width || !height) return;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(60, Math.min(240, Math.floor(width / 7)));
      drops = Array.from({ length: count }, () => makeDrop(true));
    };

    let raf = 0;
    const tick = () => {
      const style = styleRef.current;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = style.line;
      ctx.lineWidth = style.width;
      ctx.lineCap = "round";
      ctx.shadowBlur = style.glow;
      ctx.shadowColor = style.glow ? style.line : "transparent";

      for (const d of drops) {
        d.y += d.speed;
        d.x += 0.45; // slight wind slant

        if (mouse.active) {
          const dx = d.x - mouse.x;
          const dy = d.y - mouse.y;
          if (dx * dx + dy * dy < UMBRELLA * UMBRELLA) {
            d.y = -24;
            d.x = Math.random() * width;
            continue;
          }
        }

        if (d.y > height + 24 || d.x > width + 24) {
          Object.assign(d, makeDrop(false));
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 0.9, d.y + d.len);
        ctx.stroke();
      }

      if (mouse.active) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, UMBRELLA, Math.PI, 0);
        ctx.strokeStyle = style.dome;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("blur", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className="crazy-scene__rain" aria-hidden="true" />;
}
