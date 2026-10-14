import { Icon } from "../shared/components/Icon";
import type { PageView } from "../shared/types";

export function MobileNavigation({
  view,
  chatOpen,
  onNavigate,
  onAsk,
}: {
  view: PageView;
  chatOpen: boolean;
  onNavigate: (view: PageView) => void;
  onAsk: () => void;
}) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {(
        [
          ["home", "home", "Home"],
          ["shorts", "shorts", "Shorts"],
          ["topics", "bookmark", "Topics"],
          ["ask", "chat", "Ask"],
        ] as const
      ).map(([id, icon, label]) => {
        const active = id === "ask" ? chatOpen : !chatOpen && view === id;
        return (
          <button
            key={id}
            aria-current={active ? "page" : undefined}
            onClick={() => (id === "ask" ? onAsk() : onNavigate(id))}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
