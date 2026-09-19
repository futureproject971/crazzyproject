import {
  Badge,
  Boxes,
  BrainCircuit,
  CarFront,
  Crosshair,
  Focus,
  Layers3,
  Rocket,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Triangle,
  UsersRound,
  Zap,
  Skull,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { HomeCategoryConfig } from "@/config/homeCategories";

const ICONS: Record<string, LucideIcon> = {
  badge: Badge,
  boxes: Boxes,
  brain: BrainCircuit,
  car: CarFront,
  crosshair: Crosshair,
  focus: Focus,
  layers: Layers3,
  rocket: Rocket,
  scan: ScanLine,
  shield: ShieldCheck,
  spark: Sparkles,
  swords: Swords,
  target: Target,
  triangle: Triangle,
  users: UsersRound,
  zap: Zap,
  skull: Skull,
};

interface CategoryCardProps {
  category: HomeCategoryConfig;
  index: number;
  productCount?: number;
  selected?: boolean;
  onActivate: (category: HomeCategoryConfig) => void;
}

export function CategoryCard({ category, index, productCount, selected = false, onActivate }: CategoryCardProps) {
  const Icon = ICONS[category.iconKey] || Crosshair;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, delay: 0.16 + index * 0.035, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onActivate(category)}
      aria-label={`Abrir ${category.name}`}
      className={`crazy-category-card group ${category.featured ? "crazy-category-card--featured" : ""} ${selected ? "crazy-category-card--selected" : ""}`}
    >
      <span className="crazy-category-card__shine" aria-hidden="true" />
      <span className="crazy-category-card__icon" aria-hidden="true">
        <Icon className="h-[1.35rem] w-[1.35rem] xl:h-6 xl:w-6" strokeWidth={2.05} />
      </span>
      <span className="min-w-0 text-left">
        <span className="crazy-category-card__name">{category.name}</span>
        {typeof productCount === "number" && productCount > 0 ? (
          <span className="crazy-category-card__meta">
            {productCount} {productCount === 1 ? "produto" : "produtos"}
          </span>
        ) : null}
      </span>
      <span className="crazy-category-card__corner" aria-hidden="true" />
    </motion.button>
  );
}
