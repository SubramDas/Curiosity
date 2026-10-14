import type { ReactNode } from "react";

/** Owns page placement; features and account state are supplied by the app. */
export function DesktopLayout({
  header,
  sidebar,
  menuOpen,
  onCloseMenu,
  children,
}: {
  header: ReactNode;
  sidebar: ReactNode;
  menuOpen: boolean;
  onCloseMenu: () => void;
  children: ReactNode;
}) {
  return (
    <div className="desktop-app">
      {header}
      {menuOpen && (
        <button
          className="navigation-backdrop"
          aria-label="Close navigation"
          onClick={onCloseMenu}
        />
      )}
      {sidebar}
      <main className="main-content">{children}</main>
    </div>
  );
}
