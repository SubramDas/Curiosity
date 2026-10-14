import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useMobileViewport } from "./useMobileViewport";

export function MobileLayout({
  header,
  sidebar,
  navigation,
  searchOpen,
  chatOpen,
  children,
}: {
  header: ReactNode;
  sidebar: ReactNode;
  navigation: ReactNode;
  searchOpen: boolean;
  chatOpen: boolean;
  children: ReactNode;
}) {
  const viewport = useMobileViewport();
  const app = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const landscape = window.matchMedia(
      "(orientation: landscape) and (max-height: 500px)",
    );
    let frame = 0;
    function focusPlayer() {
      if (!landscape.matches || chatOpen) return;
      frame = requestAnimationFrame(() =>
        app.current
          ?.querySelector(".player-section:not(.short-player)")
          ?.scrollIntoView({ block: "start" }),
      );
    }
    focusPlayer();
    landscape.addEventListener("change", focusPlayer);
    return () => {
      cancelAnimationFrame(frame);
      landscape.removeEventListener("change", focusPlayer);
    };
  }, [chatOpen]);
  const style = {
    "--visible-height": `${viewport.height}px`,
    "--visible-top": `${viewport.top}px`,
  } as CSSProperties;
  return (
    <div
      ref={app}
      style={style}
      className={`mobile-app ${searchOpen ? "search-open" : ""} ${chatOpen ? "chat-open" : ""} ${viewport.keyboardOpen ? "keyboard-open" : ""}`}
    >
      {header}
      {sidebar}
      <main className="main-content">{children}</main>
      {navigation}
    </div>
  );
}
