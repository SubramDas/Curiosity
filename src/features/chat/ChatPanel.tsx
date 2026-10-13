import { useState } from "react";
import { callApi, readableTitle } from "../../lib/api";
import type { Answer, Video } from "../../types";

export function ChatPanel({
  topic,
  videos,
  onSelect,
  onActivity,
}: {
  topic: string;
  videos: Video[];
  onSelect: (video: Video) => void;
  onActivity: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const related =
    answer && !answer.insufficientInformation
      ? videos.find((video) => /cuda/i.test(video.title))
      : undefined;
  async function ask(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !question.trim()) return;
    setBusy(true);
    setError("");
    setAnswer(null);
    onActivity();
    try {
      setAnswer(await callApi<Answer>("chat", { topic, question }));
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Chat is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="chat-panel">
      <span className="eyebrow">MAKE IT CLICK</span>
      <h2>Ask a doubt</h2>
      <p className="muted">
        This prototype has a small set of CUDA notes. It cannot read the video’s
        transcript.
      </p>
      <form onSubmit={ask}>
        <label htmlFor="question">What would you like explained?</label>
        <textarea
          id="question"
          maxLength={2000}
          rows={3}
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            onActivity();
          }}
          placeholder="How do the CPU and GPU work together?"
        />
        <button disabled={busy || !question.trim()}>
          {busy ? "Thinking…" : "Ask →"}
        </button>
      </form>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {answer && (
        <div className="chat-answer" aria-live="polite">
          <p>{answer.answer}</p>
          {answer.sources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              {source.title} ↗
            </a>
          ))}
          <p className="fine-print">
            AI explanation from supplied notes. Check the source; mistakes are
            possible.
          </p>
        </div>
      )}
      {related && (
        <div className="related-video">
          <span className="eyebrow">EXPLORE FURTHER</span>
          <button onClick={() => onSelect(related)}>
            {readableTitle(related.title)} →
          </button>
          <small>
            Suggested from its title; unreviewed video, not evidence for this
            answer.
          </small>
        </div>
      )}
    </aside>
  );
}
