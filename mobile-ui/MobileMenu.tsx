import { Icon } from "../shared/components/Icon";
import type { PageView } from "../shared/types";

export function MobileMenu({
  open,
  onNavigate,
  onClose,
  demo,
  onDemo,
}: {
  open: boolean;
  onNavigate: (view: PageView) => void;
  onClose: () => void;
  demo: boolean;
  onDemo: (value: boolean) => void;
}) {
  if (!open) return null;
  return (
    <>
      <button
        className="navigation-backdrop mobile-backdrop"
        aria-label="Close navigation"
        onClick={onClose}
      />
      <aside
        id="mobile-menu"
        className="mobile-menu"
        aria-label="Main navigation"
      >
        <h2>Explore Curiosity</h2>
        {(
          [
            ["home", "home", "Home"],
            ["topics", "bookmark", "Your topics"],
            ["history", "history", "Continue watching"],
          ] as const
        ).map(([id, icon, label]) => (
          <button className="nav-item" key={id} onClick={() => onNavigate(id)}>
            <Icon name={icon} />
            {label}
          </button>
        ))}
        <details className="developer-options">
          <summary>Developer options</summary>
          <label className="demo-toggle">
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => onDemo(e.target.checked)}
            />
            30-second timer demo
          </label>
        </details>
        <p className="fine-print">
          Hackathon demo · 18+
          <br />
          YouTube videos belong to their creators.
          <br />
          <a href="/demo-info.html">Demo and data information</a>
        </p>
      </aside>
    </>
  );
}
