import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import lightWallpaper from "@/assets/crazzy-wallpaper-light.webp";
import darkWallpaper from "@/assets/crazzy-wallpaper-dark.webp";

/**
 * The supplied CRAZZY wallpaper is the environmental layer only.
 * All functional UI stays as real HTML above it.
 *
 * The active wallpaper is driven by the RESOLVED THEME so switching to dark
 * physically swaps to the dark image (a real asset change), instead of
 * relying on a CSS !important toggle fighting framer-motion's inline opacity.
 */
export function FuturisticBackground() {
  const reducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes only knows the theme on the client; before mount we default
  // to the light wallpaper so there is no flash of the wrong image.
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const drift = {
    scale: reducedMotion ? 1 : [1.005, 1.012, 1.005],
    x: reducedMotion ? 0 : [0, 3, 0],
    y: reducedMotion ? 0 : [0, -2, 0],
  };

  const driftTransition = {
    scale: { duration: 18, repeat: Infinity, ease: "easeInOut" as const },
    x: { duration: 20, repeat: Infinity, ease: "easeInOut" as const },
    y: { duration: 16, repeat: Infinity, ease: "easeInOut" as const },
  };

  const fade = { opacity: { duration: 0.55, ease: "easeInOut" as const } };

  return (
    <div className="crazy-scene" aria-hidden="true">
      <motion.img
        src={lightWallpaper}
        alt=""
        className="crazy-scene__wallpaper crazy-scene__wallpaper--light"
        initial={false}
        animate={{ opacity: isDark ? 0 : 1, ...drift }}
        transition={{ ...fade, ...driftTransition }}
      />
      <motion.img
        src={darkWallpaper}
        alt=""
        className="crazy-scene__wallpaper crazy-scene__wallpaper--dark"
        initial={false}
        animate={{ opacity: isDark ? 1 : 0, ...drift }}
        transition={{ ...fade, ...driftTransition }}
      />
      <div className="crazy-scene__exposure" />
      <div className="crazy-scene__focus" />
      <div className="crazy-scene__grain" />
      <div className="crazy-scene__vignette" />
    </div>
  );
}
