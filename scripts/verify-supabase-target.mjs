import fs from "node:fs";
import path from "node:path";

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const i = line.indexOf("=");
    return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
  }));
}

const root = process.cwd();
const env = readEnv(path.join(root, ".env"));
const config = fs.readFileSync(path.join(root, "supabase", "config.toml"), "utf8");
const match = config.match(/^project_id\s*=\s*"([^"]+)"/m);
const configRef = match?.[1] || "";
const envRef = env.VITE_SUPABASE_PROJECT_ID || (() => {
  const url = env.VITE_SUPABASE_URL || "";
  return url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] || "";
})();

if (!envRef || !configRef) {
  console.error("[CRAZZY] Não foi possível identificar os dois project refs. Verifique .env e supabase/config.toml.");
  process.exit(2);
}

if (envRef !== configRef) {
  console.error(`\n[CRAZZY] BLOQUEADO: projeto Supabase divergente.\n  frontend (.env): ${envRef}\n  supabase/config.toml: ${configRef}\n\nNão faça deploy/migration até confirmar qual é produção.\n`);
  process.exit(1);
}

console.log(`[CRAZZY] Supabase target confirmado: ${envRef}`);
