import type { ReactNode } from "react";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";

export type CarbonTabsItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type CarbonTabsProps = {
  items: CarbonTabsItem[];
  activeTabId: string;
  onChange: (tabId: string) => void;
  ariaLabel: string;
};

/**
 * Shared, controlled Carbon v11 tabs.
 * Carbon owns keyboard navigation, focus management, and tab semantics.
 */
export function CarbonTabs({ items, activeTabId, onChange, ariaLabel }: CarbonTabsProps) {
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === activeTabId));

  return (
    <Tabs
      selectedIndex={selectedIndex}
      onChange={({ selectedIndex: nextIndex }) => {
        const nextItem = items[nextIndex];
        if (nextItem && !nextItem.disabled) onChange(nextItem.id);
      }}
    >
      <TabList aria-label={ariaLabel}>
        {items.map((item) => (
          <Tab key={item.id} disabled={item.disabled}>
            {item.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {items.map((item) => (
          <TabPanel key={item.id}>{item.content}</TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}
