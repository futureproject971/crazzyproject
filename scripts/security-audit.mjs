import fs from "node:fs";
import path from "node:path";

const roots = ["src", "public"];
const forbidden = [
  { label: "PurinCash live/test key", re: /ps_(?:live|test)_[A-Za-z0-9_-]{8,}/i },
  { label: "Supabase service role reference in client code", re: /SUPABASE_SERVICE_ROLE_KEY|service_role/i },
  { label: "PurinCash secret reference in client code", re: /PURINCASH_(?:API_KEY|WEBHOOK_SECRET)/i },
  { label: "retired UsePaySync frontend reference", re: /usepaysync|sync-product-usepaysync|pix-payment/i },
];

const textExt = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".html", ".css", ".md"]);
const findings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (textExt.has(path.extname(entry.name))) {
      const rel = path.relative(process.cwd(), full);
      const text = fs.readFileSync(full, "utf8");
      for (const rule of forbidden) {
        if (rule.re.test(text)) findings.push(`${rel}: ${rule.label}`);
        rule.re.lastIndex = 0;
      }
    }
  }
}

for (const root of roots) walk(path.resolve(root));

if (findings.length) {
  console.error("Security audit failed:\n" + findings.map((x) => ` - ${x}`).join("\n"));
  process.exit(1);
}
console.log("Client security audit passed: no known backend secrets or retired payment integrations found.");
