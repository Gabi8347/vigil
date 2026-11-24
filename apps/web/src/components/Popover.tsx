"use client";

import { type ReactNode, useId } from "react";
import { Button } from "./primitives.tsx";

export function Popover({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <>
      <Button popoverTarget={id}>{label}</Button>
      <div id={id} popover="auto" className="popover">
        {children}
      </div>
    </>
  );
}
