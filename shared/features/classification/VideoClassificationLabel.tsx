import { useContext } from "react";
import { RelatedUniversesRendererContext } from "./RelatedUniversesRendererContext";
import type { Video } from "../../types";
import { universes } from "../universes/universe-rules";
import {
  useClassifiedVideos,
  useClassificationEntry,
  useVisibleClassification,
} from "./ClassificationProvider";

function ClassificationLabelContent({
  video,
  short = false,
}: {
  video: Video;
  short?: boolean;
}) {
  const renderRelated = useContext(RelatedUniversesRendererContext);
  const [classified] = useClassifiedVideos([video]);
  const { entry, retry } = useClassificationEntry(video.id);
  const classification = classified.classification;
  if (!classification) {
    if (entry?.status === "waiting" || entry?.status === "idle" || !entry)
      return <span className="classification-status">Waiting for topic</span>;
    if (entry?.status === "finding")
      return <span className="classification-status">Finding topic…</span>;
    if (entry?.status === "limited")
      return (
        <span className="classification-status" title={entry.message}>
          Daily label limit reached
        </span>
      );
    if (entry?.status === "failed")
      return (
        <span className="classification-status" title={entry.message}>
          Topic unavailable{" "}
          <button
            className="classification-retry"
            onClick={(event) => {
              event.stopPropagation();
              retry();
            }}
          >
            Retry label
          </button>
        </span>
      );
    return null;
  }
  if (!classification.primaryUniverse)
    return (
      <span className="classification-status" title={classification.reason}>
        Topic unassigned
      </span>
    );
  const related = classification.relatedUniverses;
  return (
    <div
      className={`universe-video-label ${short ? "short-universe-label" : ""} ${renderRelated && related.length ? "universe-video-label-with-popover" : ""}`}
      title={classification.reason}
    >
      <span>
        {classification.primaryUniverse
          ? `${universes[classification.primaryUniverse].name} – `
          : ""}
        {classification.topic.label}
      </span>
      {classification.topic.status === "provisional" && (
        <span className="classification-provisional">Provisional topic</span>
      )}
      {related.length > 0 &&
        (renderRelated ? (
          renderRelated(related)
        ) : (
          <details
            className="universe-related-details"
            onClick={(event) => event.stopPropagation()}
          >
            <summary
              aria-label={`Also related to ${related.map((id) => universes[id].name).join(", ")}`}
            >
              +{related.length}
            </summary>
            <span>{related.map((id) => universes[id].name).join(" · ")}</span>
          </details>
        ))}
    </div>
  );
}

export function VideoClassificationLabel({
  video,
  short = false,
}: {
  video: Video;
  short?: boolean;
}) {
  const ref = useVisibleClassification(video);
  return (
    <div ref={ref} className="classification-label-container">
      <ClassificationLabelContent video={video} short={short} />
    </div>
  );
}
