import { useLayoutEffect, useRef } from "react";
import type { LearningContent } from "../../../shared/features/learning/LearningWorkspace";
import "./desktop-chat.css";

export function DesktopLearningLayout({
  feed,
  chat,
  hasVideos,
  chatExpanded,
}: LearningContent) {
  const layout = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let frame = 0;
    const resize = () => {
      const root = layout.current;
      const panel = root?.querySelector<HTMLElement>(".desktop-teacher");
      if (!root || !panel) return;
      const header =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--header-height",
          ),
        ) || 68;
      const top = Math.max(header + 20, panel.getBoundingClientRect().top);
      root.style.setProperty(
        "--teacher-panel-height",
        `${Math.max(280, window.innerHeight - top - 20)}px`,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    };
    resize();
    const observer = new ResizeObserver(schedule);
    if (layout.current) observer.observe(layout.current);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
    };
  }, [chatExpanded]);
  return (
    <div
      ref={layout}
      className={`desktop-learning-layout ${chatExpanded ? "chat-expanded" : ""} ${!hasVideos ? "without-video" : ""}`}
    >
      {/* Keep both subtrees in place so resizing chat never remounts the player. */}
      <div className="desktop-learning-feed">{feed}</div>
      {chat}
    </div>
  );
}
