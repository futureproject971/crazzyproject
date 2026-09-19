export type CategoryAction =
  | { type: "category"; destination: string }
  | { type: "product"; destination: string };

export interface HomeCategoryConfig {
  id: string;
  name: string;
  slug: string;
  iconKey: string;
  action: CategoryAction;
  featured?: boolean;
  placement?: "left-top" | "left-middle" | "left-bottom" | "right-top" | "right-middle" | "right-bottom" | "bottom-right";
}

const category = (
  slug: string,
  name: string,
  iconKey: string,
  placement: HomeCategoryConfig["placement"],
  featured = false,
): HomeCategoryConfig => ({
  id: `fallback-${slug}`,
  name,
  slug,
  iconKey,
  action: { type: "category", destination: `/produtos?game=${encodeURIComponent(slug)}` },
  placement,
  featured,
});

/**
 * Categorias canonicas da Home CRAZZY PROJECT.
 *
 * Esta lista representa as categorias visuais oficiais da pagina inicial e
 * tambem define os slugs que devem existir no catalogo/admin. Registros extras
 * do banco podem continuar existindo, mas estas categorias nao devem sumir da
 * Home nem do fluxo de cadastro de produtos.
 */
export const DEFAULT_HOME_CATEGORIES: HomeCategoryConfig[] = [
  category("warzone", "Call of Duty Warzone", "crosshair", "left-top", true),
  category("valorant", "Valorant", "spark", "left-top", true),
  category("apex", "Apex", "triangle", "left-top"),

  category("fivem", "FiveM", "layers", "left-middle"),
  category("gta-online", "GTA Online", "car", "left-middle"),

  category("bloodstrike", "BloodStrike", "zap", "left-bottom"),
  category("ia-universal", "IA Universal", "brain", "right-top", true),
  category("aim-universal", "AIM Universal", "target", "left-bottom"),

  category("dead-by-daylight", "Dead by Daylight", "scan", "right-top"),

  category("arc-raiders", "ARC Raiders", "rocket", "right-middle"),
  category("vanguard-emulator", "Vanguard Emulator", "shield", "right-middle", true),

  category("rust", "Rust", "boxes", "right-bottom"),
  category("hell-let-loose", "Hell Let Loose", "swords", "right-bottom"),

  category("scum", "SCUM", "skull", "bottom-right"),
  category("squad", "Squad", "users", "bottom-right"),
  category("war-dogs", "War Dogs", "badge", "bottom-right"),
  category("counter-strike-2", "Counter-Strike 2", "crosshair", "bottom-right", true),
];

export const normalizeSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const getCategoryVisualConfig = (slug: string | null | undefined, name: string) => {
  const normalizedSlug = normalizeSlug(slug || name);
  return (
    DEFAULT_HOME_CATEGORIES.find((item) => item.slug === normalizedSlug) ||
    DEFAULT_HOME_CATEGORIES.find((item) => normalizeSlug(item.name) === normalizeSlug(name)) ||
    null
  );
};
