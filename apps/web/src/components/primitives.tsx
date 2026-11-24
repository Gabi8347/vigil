import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function Button({ type = "button", className, ...props }: ComponentPropsWithoutRef<"button">) {
  return <button {...props} type={type} className={className ? `button ${className}` : "button"} />;
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}

export function Table({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="table-scroll">
      <table className="table">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
