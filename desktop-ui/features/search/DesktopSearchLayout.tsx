import type { ReactNode } from "react";
import "./search.css";

export function DesktopSearchLayout({ children }: { children: ReactNode }) {
  return (
    <section className="desktop-search" aria-label="Learning search">
      {children}
    </section>
  );
}
