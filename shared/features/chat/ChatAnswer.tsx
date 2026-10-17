import "./chat-content.css";
import { AnswerText } from "./AnswerText";
import { SuggestedVideo } from "./SuggestedVideo";
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
    <article className="chat-turn" aria-label={`Answer to: ${turn.question}`}>
      <p className="chat-question">
        <strong>You:</strong> {turn.question}
      </p>
      <details className="chat-relevance chat-context">
        <summary>
          <strong>{label}</strong>
        </summary>
        <p>{answer.relationReason}</p>
        {answer.questionVideo && (
          <p>Video when asked: {readableTitle(answer.questionVideo.title)}</p>
        )}
      </details>
      <div className="chat-answer">
        <AnswerText text={answer.answer} />
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
      {answer.recommendations.length > 0 && (
        <section className="chat-suggestions" aria-label="Suggested videos">
          <h3>Videos to explore</h3>
          {answer.recommendations.map((video) => (
            <SuggestedVideo key={video.id} video={video} onSelect={onSelect} />
          ))}
          <p className="fine-print">
            YouTube search matches · Content not reviewed.
          </p>
        </section>
      )}
      {answer.notices.map((notice, index) => (
        <p className="fine-print" key={index}>
          {notice}
        </p>
      ))}
    </article>
  );
}
