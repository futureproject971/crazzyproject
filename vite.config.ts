import { defineConfig, loadEnv } from "vite";
import fs from "node:fs";
import { validateSupabaseTarget } from "./scripts/supabase-target.mjs";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { CRAZZY_SUPABASE_PUBLIC } from "./src/config/supabasePublic";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  if (command === "build" && process.env.VERCEL === "1") {
    const config = fs.readFileSync("supabase/config.toml", "utf8");
    const env = loadEnv(mode, process.cwd(), "VITE_");
    validateSupabaseTarget(
      {
        ...env,
        VITE_SUPABASE_PROJECT_ID: env.VITE_SUPABASE_PROJECT_ID || CRAZZY_SUPABASE_PUBLIC.projectId,
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || CRAZZY_SUPABASE_PUBLIC.url,
        VITE_SUPABASE_PUBLISHABLE_KEY:
          env.VITE_SUPABASE_PUBLISHABLE_KEY || CRAZZY_SUPABASE_PUBLIC.publishableKey,
      },
      config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1],
    );
  }
  return ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["@supabase/supabase-js"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    // Keep large WebP wallpapers/product artwork as cacheable files instead of
    // inflating the JavaScript bundle with base64 data URLs.
    assetsInlineLimit: 4096,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
});
});
