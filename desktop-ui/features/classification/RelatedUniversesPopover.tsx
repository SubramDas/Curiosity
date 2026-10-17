import { useId, useRef, useState } from "react";
import {
  universes,
  type UniverseId,
} from "../../../shared/features/universes/universe-rules";
import { usePopoverPosition } from "./usePopoverPosition";
import "./related-universes.css";

export function RelatedUniversesPopover({
  related,
}: {
  related: UniverseId[];
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const position = usePopoverPosition(trigger, panel, open, related.join(","));
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="related-universe-trigger"
        popoverTarget={id}
        aria-controls={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${related.length} related ${related.length === 1 ? "Universe" : "Universes"}`}
        onClick={(event) => event.stopPropagation()}
      >
        +{related.length}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className="desktop-related-popover"
        onClick={(event) => event.stopPropagation()}
        onToggle={(event) => {
          const shown = event.newState === "open";
          setOpen(shown);
          if (shown) position();
        }}
      >
        <div className="related-popover-header">
          <h3 id={`${id}-title`}>Also related to</h3>
          <button
            type="button"
            aria-label="Close related Universes"
            onClick={() => {
              panel.current?.hidePopover();
              trigger.current?.focus({ preventScroll: true });
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <p id={`${id}-description`}>Other connections for this video.</p>
        <ul>
          {related.map((universe) => (
            <li key={universe}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" />
              </svg>
              <span>{universes[universe].name}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function renderDesktopRelatedUniverses(related: UniverseId[]) {
  return <RelatedUniversesPopover related={related} />;
}
