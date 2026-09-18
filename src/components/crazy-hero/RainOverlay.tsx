import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Pixel-rain layer for the hero background.
 * Raindrops fall over the wallpaper; the mouse acts like an umbrella,
 * carving a dry dome that follows the cursor (drops are deflected around it).
 * Purely decorative: pointer-events none, sits inside the .crazy-scene layer.
 */
export function RainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

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
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(150,190,255,0.34)";
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";

      for (const d of drops) {
        d.y += d.speed;
        d.x += 0.45; // slight wind slant

        if (mouse.active) {
          const dx = d.x - mouse.x;
          const dy = d.y - mouse.y;
          if (dx * dx + dy * dy < UMBRELLA * UMBRELLA) {
            // hit the umbrella: slide off and respawn at the top
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
        // faint umbrella dome + splash ring
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, UMBRELLA, Math.PI, 0);
        ctx.strokeStyle = "rgba(150,190,255,0.12)";
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
