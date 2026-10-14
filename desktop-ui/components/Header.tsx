import type { ReactNode } from "react";
import { Icon } from "../../shared/components/Icon";

export function Header({
  query,
  onQuery,
  onSearch,
  busy,
  menuOpen,
  onMenu,
  onHome,
  account,
}: {
  query: string;
  onQuery: (value: string) => void;
  onSearch: (event: React.SubmitEvent<HTMLFormElement>) => void;
  busy: boolean;
  menuOpen: boolean;
  onMenu: () => void;
  onHome: () => void;
  account: ReactNode;
}) {
  return (
    <header className="site-header">
      <div className="header-brand">
        <button
          className="icon-button"
          aria-label="Toggle navigation"
          aria-controls="sidebar"
          aria-expanded={menuOpen}
          onClick={onMenu}
        >
          <Icon name="menu" />
        </button>
        <button className="brand" onClick={onHome}>
          <span className="brand-mark">
            <Icon name="play" />
          </span>
          curiosity<sup>IN</sup>
        </button>
      </div>
      <form className="search-form" onSubmit={onSearch}>
        <label className="sr-only" htmlFor="search">
          Search any topic
        </label>
        <input
          id="search"
          maxLength={480}
          required
          placeholder="Search anything you’re curious about"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
        <button
          aria-label={busy ? "Searching…" : "Search"}
          title="Search"
          disabled={busy || !query.trim()}
        >
          <Icon name="search" />
        </button>
      </form>
      <div className="header-account">{account}</div>
    </header>
  );
}
