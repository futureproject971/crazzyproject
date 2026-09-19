import { useMemo } from "react";
import { CategoryCard } from "./CategoryCard";
import type { HomeCategoryConfig } from "@/config/homeCategories";

interface CategoryCloudProps {
  categories: HomeCategoryConfig[];
  productCounts: Record<string, number>;
  selectedSlug?: string | null;
  onActivate: (category: HomeCategoryConfig) => void;
}

const ZONES: HomeCategoryConfig["placement"][] = [
  "left-top",
  "left-middle",
  "left-bottom",
  "right-top",
  "right-middle",
  "right-bottom",
  "bottom-right",
];

export function CategoryCloud({ categories, productCounts, selectedSlug, onActivate }: CategoryCloudProps) {
  const grouped = useMemo(() => {
    const result = Object.fromEntries(ZONES.map((zone) => [zone, []])) as Record<string, HomeCategoryConfig[]>;
    categories.forEach((category, index) => {
      const zone = category.placement || ZONES[index % ZONES.length];
      result[zone || "bottom-right"].push(category);
    });
    return result;
  }, [categories]);

  let cardIndex = 0;

  return (
    <div id="categorias" className="crazy-category-cloud">
      {ZONES.map((zone) => (
        <div key={zone} className={`crazy-category-zone crazy-category-zone--${zone}`}>
          {grouped[zone || ""]?.map((category) => {
            const index = cardIndex++;
            const selected = selectedSlug === category.slug;
            return (
              <div
                key={category.id}
                className={`crazy-category-slot crazy-category-slot--${zone} ${selected ? "is-selected" : ""}`}
              >
                <CategoryCard
                  category={category}
                  index={index}
                  productCount={productCounts[category.slug]}
                  selected={selected}
                  onActivate={onActivate}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
