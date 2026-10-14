import type { ChatTurn } from "./useTutorChat";
import type { Video } from "../../types";
import { formatPosition } from "../videos/video-format";
import { readableTitle } from "../../lib/api";

export function ChatAnswer({
  turn,
  onSelect,
  onJump,
}: {
  turn: ChatTurn;
  onSelect: (video: Video) => void;
  onJump: (video: Video, seconds: number) => void;
}) {
  const { answer } = turn;
  const label =
    answer.relation === "unrelated"
      ? answer.videoContext === "analyzed"
        ? "This question is not related to that video."
        : "This question appears unrelated to that video's topic."
      : answer.relation === "related"
        ? "Related to that video's topic."
        : answer.relation === "unclear"
          ? "I’m not sure this question relates to that video."
          : "Let's explore this question.";
  return (
    <article className="chat-turn">
      <p className="chat-question">
        <strong>You:</strong> {turn.question}
      </p>
      {answer.questionVideo && (
        <p className="fine-print">
          Video when asked: {readableTitle(answer.questionVideo.title)}
        </p>
      )}
      <p className="chat-relevance">
        <strong>{label}</strong> {answer.relationReason}
      </p>
      <div className="chat-answer">
        <p>{answer.answer}</p>
        {answer.sources.map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            {source.title} ↗
          </a>
        ))}
        {answer.timestamp &&
          turn.video &&
          answer.timestamp.videoId === turn.video.id && (
            <div className="chat-timestamp">
              <button
                onClick={() =>
                  onJump(turn.video!, answer.timestamp!.startSeconds)
                }
              >
                Watch at {formatPosition(answer.timestamp.startSeconds)}
              </button>
              <p>{answer.timestamp.explanation}</p>
              <small>
                {answer.timestamp.evidence} · AI-matched section; timing may be
                approximate.
              </small>
            </div>
          )}
        <p className="fine-print">
          {answer.answerBasis === "checked-notes"
            ? "Explanation using supplied reference notes."
            : answer.answerBasis === "video-analysis"
              ? "Explanation using AI video analysis."
              : "General AI explanation; not checked against live sources."}{" "}
          AI can make mistakes.
        </p>
      </div>
      {answer.recommendations.map((video) => (
        <div className="related-video" key={video.id}>
          <button onClick={() => onSelect(video)}>
            {readableTitle(video.title)} →
          </button>
          <small>
            YouTube search match for your question · Content not reviewed.
          </small>
        </div>
      ))}
      {answer.notices.map((notice, index) => (
        <p className="fine-print" key={index}>
          {notice}
        </p>
      ))}
    </article>
  );
}
