import { defineConfig, loadEnv } from "vite";
import fs from "node:fs";
import { validateSupabaseTarget } from "./scripts/supabase-target.mjs";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  if (command === "build" && process.env.VERCEL === "1") {
    const config = fs.readFileSync("supabase/config.toml", "utf8");
    validateSupabaseTarget(loadEnv(mode, process.cwd(), "VITE_"), config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1]);
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
    assetsInlineLimit: 10_000_000,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
});
});
