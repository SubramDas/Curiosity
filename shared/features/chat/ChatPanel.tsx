import { useState } from "react";
import type { Video } from "../../types";
import { readableTitle } from "../../lib/api";
import type { useTutorChat } from "./useTutorChat";
import { ChatAnswer } from "./ChatAnswer";
import { useConversationScroll } from "./useConversationScroll";

export function ChatPanel({
  topic,
  currentVideo,
  positionSeconds,
  chat,
  onSelect,
  onJump,
  onActivity,
  expanded = false,
  onToggleExpanded,
}: {
  topic: string;
  currentVideo: Video | null;
  positionSeconds: number;
  chat: ReturnType<typeof useTutorChat>;
  onSelect: (video: Video) => void;
  onJump: (video: Video, seconds: number) => void;
  onActivity: () => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  const [question, setQuestion] = useState("");
  const scroll = useConversationScroll(chat.turns);
  const desktop = Boolean(onToggleExpanded);
  async function send(text: string) {
    onActivity();
    if (await chat.ask(text, topic, currentVideo, positionSeconds))
      setQuestion((current) => (current === text ? "" : current));
  }
  const form = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void send(question);
      }}
    >
      <label htmlFor="question" className={desktop ? "sr-only" : undefined}>
        What would you like explained?
      </label>
      <textarea
        id="question"
        maxLength={2000}
        rows={desktop ? 2 : 3}
        value={question}
        onChange={(event) => {
          setQuestion(event.target.value);
          onActivity();
        }}
        placeholder={
          desktop ? "Ask a follow-up…" : "Ask a question about anything…"
        }
      />
      <button
        disabled={chat.busy || !question.trim()}
        aria-label={desktop ? "Send question" : undefined}
      >
        {desktop ? (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="m3 3 19 9-19 9 4-9-4-9ZM7 12h15" />
          </svg>
        ) : chat.busy ? (
          "Thinking…"
        ) : (
          "Ask →"
        )}
      </button>
    </form>
  );
  const followUps = chat.turns.length > 0 && (
    <div className="chat-follow-ups">
      {[
        ["Explain simply", "Explain that more simply"],
        ["Example", "Give me an example"],
        ["Go deeper", "Go deeper"],
      ].map(([label, prompt]) => (
        <button
          key={prompt}
          className="secondary"
          aria-label={prompt}
          disabled={chat.busy}
          onClick={() => void send(prompt)}
        >
          {desktop ? label : prompt}
        </button>
      ))}
    </div>
  );
  const explainPart = currentVideo && (
    <button
      className="secondary chat-explain-part"
      disabled={chat.busy}
      onClick={() =>
        void send(
          `Explain the part around ${Math.floor(positionSeconds)} seconds in the current video.`,
        )
      }
    >
      Explain this part
    </button>
  );
  const status = (
    <>
      {chat.busy && (
        <p role="status" className="chat-status">
          Preparing your explanation…
        </p>
      )}
      {chat.error && (
        <p role="alert" className="notice">
          {chat.error}
        </p>
      )}
    </>
  );
  return (
    <aside
      className={`chat-panel ${desktop ? "desktop-teacher" : ""}`}
      aria-label="Teacher conversation"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) onToggleExpanded?.();
      }}
    >
      {desktop ? (
        <header className="teacher-header">
          <div className="teacher-title-row">
            <h2>Ask your teacher</h2>
            <button
              className="secondary"
              aria-expanded={expanded}
              onClick={onToggleExpanded}
            >
              {expanded ? "Back to video" : "Expand chat"}
            </button>
          </div>
          <p className="teacher-video-context">
            {currentVideo
              ? `About: ${readableTitle(currentVideo.title)}`
              : "Ask about any topic"}
          </p>
          <div className="teacher-header-actions">
            {explainPart}
            {chat.turns.length > 0 && (
              <button className="text-button" onClick={chat.clear}>
                New conversation
              </button>
            )}
          </div>
        </header>
      ) : (
        <>
          <span className="eyebrow">MAKE IT CLICK</span>
          <h2>Ask a doubt</h2>
          <p className="muted">
            {currentVideo
              ? "Ask about this video or any other topic. I’ll explain and suggest videos or a matching section when available."
              : "Ask about any topic. I’ll explain and suggest relevant videos when available."}
          </p>
          {chat.turns.length > 0 && (
            <button className="text-button" onClick={chat.clear}>
              New conversation
            </button>
          )}
        </>
      )}
      <div className="chat-conversation-shell">
        <div
          className="chat-conversation"
          ref={scroll.conversation}
          onScroll={scroll.onScroll}
          role="log"
          aria-label="Conversation messages"
          aria-live="polite"
          aria-relevant="additions"
        >
          {chat.turns.map((turn) => (
            <ChatAnswer
              key={turn.id}
              turn={turn}
              onSelect={onSelect}
              onJump={onJump}
            />
          ))}
        </div>
        {!chat.turns.length && desktop && (
          <p className="teacher-empty">
            Ask a question to make this topic click. Your explanation will
            appear here.
          </p>
        )}
        {scroll.unread > 0 && (
          <button
            className="chat-new-answer secondary"
            onClick={scroll.showLatest}
          >
            {scroll.unread} new {scroll.unread === 1 ? "answer" : "answers"} ↓
          </button>
        )}
      </div>
      {desktop ? (
        <footer className="teacher-composer">
          {followUps}
          {form}
          {status}
          <p className="fine-print">
            AI can make mistakes. Check important details.
          </p>
        </footer>
      ) : (
        <>
          {form}
          {followUps}
          {explainPart}
          {status}
        </>
      )}
    </aside>
  );
}
