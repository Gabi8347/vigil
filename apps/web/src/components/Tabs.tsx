"use client";

import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";
import { Button } from "./primitives.tsx";

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ label, tabs }: { label: string; tabs: readonly Tab[] }) {
  const prefix = useId();
  const tablist = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState(tabs[0]?.id);
  const selected = tabs.some(({ id }) => id === selection) ? selection : tabs[0]?.id;

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = (index + tabs.length - 1) % tabs.length;
        break;
      case "ArrowRight":
        next = (index + 1) % tabs.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    const target = tabs[next];
    if (!target) return;
    event.preventDefault();
    setSelection(target.id);
    tablist.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div className="tabs">
      <div ref={tablist} className="tab-list" role="tablist" aria-label={label}>
        {tabs.map(({ id, label }, index) => (
          <Button
            key={id}
            id={`${prefix}-tab-${id}`}
            role="tab"
            aria-selected={id === selected}
            aria-controls={`${prefix}-panel-${id}`}
            tabIndex={id === selected ? 0 : -1}
            onClick={() => setSelection(id)}
            onKeyDown={(event) => handleKey(event, index)}
          >
            {label}
          </Button>
        ))}
      </div>
      {tabs.map(({ id, content }) => (
        <div
          key={id}
          id={`${prefix}-panel-${id}`}
          role="tabpanel"
          aria-labelledby={`${prefix}-tab-${id}`}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Tab panels can contain only text or tables, so the panel must be focusable.
          tabIndex={0}
          hidden={id !== selected}
        >
          {content}
        </div>
      ))}
    </div>
  );
}
