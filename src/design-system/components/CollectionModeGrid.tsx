import { Button } from "@carbon/react";
import "./CollectionModeGrid.css";

export type CollectionModeOption = {
  id: string;
  label: string;
  description: string;
};

export function CollectionModeGrid({
  options,
  selectedId,
  onSelect,
  ariaLabel,
}: {
  options: CollectionModeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="kosmo-collection-mode-grid" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <Button
          key={option.id}
          kind="ghost"
          size="lg"
          className={selectedId === option.id
            ? "kosmo-collection-mode-grid__item is-selected"
            : "kosmo-collection-mode-grid__item"}
          aria-pressed={selectedId === option.id}
          onClick={() => onSelect(option.id)}
        >
          <strong>{option.label}</strong>
          <span>{option.description}</span>
        </Button>
      ))}
    </div>
  );
}
