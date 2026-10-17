import { Brand } from "../shared/components/Brand";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../shared/components/Icon";

export function MobileHeader({
  query,
  onQuery,
  onSearch,
  busy,
  searchOpen,
  onSearchOpen,
  onHome,
  onMenu,
  menuOpen,
  account,
  chatOpen,
  onCloseChat,
}: {
  query: string;
  onQuery: (query: string) => void;
  onSearch: (event: React.SubmitEvent<HTMLFormElement>) => void;
  busy: boolean;
  searchOpen: boolean;
  onSearchOpen: (open: boolean) => void;
  onHome: () => void;
  onMenu: () => void;
  menuOpen: boolean;
  account: ReactNode;
  chatOpen: boolean;
  onCloseChat: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchOpen) input.current?.focus();
  }, [searchOpen]);
  return (
    <header className="mobile-header">
      <div className="mobile-header-row">
        {chatOpen ? (
          <>
            <button
              className="icon-button"
              onClick={onCloseChat}
              aria-label="Back to videos"
            >
              ←
            </button>
            <strong>Ask your teacher</strong>
          </>
        ) : (
          <>
            <button
              className="icon-button"
              onClick={onMenu}
              aria-label="Toggle navigation"
              aria-controls="mobile-menu"
              aria-expanded={menuOpen}
            >
              <Icon name="menu" />
            </button>
            <button
              className="mobile-brand"
              onClick={onHome}
              aria-label="Revelink home"
            >
              <Brand />
            </button>
          </>
        )}
        <button
          className="icon-button mobile-search-toggle"
          aria-label={searchOpen ? "Close search" : "Open search"}
          aria-expanded={searchOpen}
          onClick={() => onSearchOpen(!searchOpen)}
        >
          <Icon name="search" />
        </button>
        <div className="mobile-account">{account}</div>
      </div>
      {searchOpen && (
        <form className="mobile-search-form" onSubmit={onSearch}>
          <label className="sr-only" htmlFor="search">
            Search any topic
          </label>
          <input
            ref={input}
            id="search"
            required
            maxLength={480}
            type="search"
            placeholder="Search anything…"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
          <button
            disabled={busy || !query.trim()}
            aria-label={busy ? "Searching…" : "Search"}
          >
            <Icon name="search" />
          </button>
        </form>
      )}
    </header>
  );
}
