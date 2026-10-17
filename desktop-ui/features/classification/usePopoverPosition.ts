import { useCallback, useLayoutEffect, type RefObject } from "react";

export function usePopoverPosition(
  trigger: RefObject<HTMLButtonElement | null>,
  panel: RefObject<HTMLDivElement | null>,
  open: boolean,
  contentKey: string,
) {
  const position = useCallback(() => {
    const button = trigger.current;
    const popup = panel.current;
    if (!button || !popup?.matches(":popover-open")) return;
    const anchor = button.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const gutter = 16;
    const gap = 10;
    if (anchor.bottom <= 0 || anchor.top >= height) {
      popup.hidePopover();
      return;
    }
    popup.style.maxHeight = `${Math.max(0, height - gutter * 2)}px`;
    const bounds = popup.getBoundingClientRect();
    const below = height - gutter - anchor.bottom - gap;
    const above = anchor.top - gap - gutter;
    const flip = below < bounds.height && above > below;
    popup.style.maxHeight = `${Math.max(0, flip ? above : below)}px`;
    const actual = popup.getBoundingClientRect();
    const preferredLeft =
      anchor.left + actual.width > width - gutter
        ? anchor.right - actual.width
        : anchor.left;
    popup.style.left = `${Math.max(gutter, Math.min(preferredLeft, width - gutter - actual.width))}px`;
    popup.style.top = `${flip ? anchor.top - gap - actual.height : anchor.bottom + gap}px`;
    popup.dataset.placement = flip ? "above" : "below";
  }, [trigger, panel]);

  useLayoutEffect(() => {
    if (!open) return;
    position();
    let frame = 0;
    const schedule = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target))
        return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(position);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) panel.current?.hidePopover();
    });
    if (trigger.current) observer.observe(trigger.current);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [open, contentKey, position, trigger, panel]);
  return position;
}
