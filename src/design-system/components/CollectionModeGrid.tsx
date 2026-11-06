import type { ComponentType } from "react";
import { Button } from "@carbon/react";
import { Building, Calendar, Chat, Map, Search, User, UserMultiple, Video } from "@carbon/icons-react";
import "./CollectionModeGrid.css";

export type CollectionModeOption = {
  id: string;
  label: string;
  description: string;
  icon?: ComponentType<any>;
};

const iconFor = (option: CollectionModeOption) => {
  if (option.icon) return option.icon;
  const key = (option.id + " " + option.label).toLowerCase();
  if (/company|companies|企业|brand|品牌|page|主页/.test(key)) return Building;
  if (/people|person|profile|creator|channel|账号|人员|创作者|频道/.test(key)) return User;
  if (/group|community|群组|社区|member|关注/.test(key)) return UserMultiple;
  if (/post|comment|reply|帖子|评论|回复|讨论/.test(key)) return Chat;
  if (/video|reel|live|short|视频|直播/.test(key)) return Video;
  if (/place|location|map|地点|位置|地图/.test(key)) return Map;
  if (/event|job|活动|招聘/.test(key)) return Calendar;
  return Search;
};

export function CollectionModeGrid({
  options,
  selectedId,
  onSelect,
  ariaLabel,
  title,
  description,
}: {
  options: CollectionModeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className="kosmo-discovery-object-selector">
      {(title || description) && (
        <header className="kosmo-discovery-object-selector__header">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
        </header>
      )}
    <div className="kosmo-collection-mode-grid" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const Icon = iconFor(option);
        return (
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
            <span className="kosmo-collection-mode-grid__icon"><Icon size={20} /></span>
            <span className="kosmo-collection-mode-grid__copy">
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </span>
          </Button>
        );
      })}
    </div>
    </section>
  );
}
