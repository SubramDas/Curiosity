import { useEffect, useRef, useState } from "react";
import type { Video } from "../../types";
import type { useTutorChat } from "./useTutorChat";
import { ChatAnswer } from "./ChatAnswer";

export function ChatPanel({
  topic,
  currentVideo,
  positionSeconds,
  chat,
  onSelect,
  onJump,
  onActivity,
}: {
  topic: string;
  currentVideo: Video | null;
  positionSeconds: number;
  chat: ReturnType<typeof useTutorChat>;
  onSelect: (video: Video) => void;
  onJump: (video: Video, seconds: number) => void;
  onActivity: () => void;
}) {
  const [question, setQuestion] = useState("");
  const conversation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (conversation.current)
      conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [chat.turns.length]);
  async function send(text: string) {
    onActivity();
    if (await chat.ask(text, topic, currentVideo, positionSeconds))
      setQuestion("");
  }
  return (
    <aside className="chat-panel">
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
      <div className="chat-conversation" ref={conversation} aria-live="polite">
        {chat.turns.map((turn, index) => (
          <ChatAnswer
            key={index}
            turn={turn}
            onSelect={onSelect}
            onJump={onJump}
          />
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(question);
        }}
      >
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
          placeholder="Ask a question about anything…"
        />
        <button disabled={chat.busy || !question.trim()}>
          {chat.busy ? "Thinking…" : "Ask →"}
        </button>
      </form>
      {chat.turns.length > 0 && (
        <div className="chat-follow-ups">
          {["Explain that more simply", "Give me an example", "Go deeper"].map(
            (text) => (
              <button
                key={text}
                className="secondary"
                disabled={chat.busy}
                onClick={() => void send(text)}
              >
                {text}
              </button>
            ),
          )}
        </div>
      )}
      {currentVideo && (
        <button
          className="secondary"
          disabled={chat.busy}
          onClick={() =>
            void send(
              `Explain the part around ${Math.floor(positionSeconds)} seconds in the current video.`,
            )
          }
        >
          Explain this part
        </button>
      )}
      {chat.busy && <p role="status">Preparing your explanation…</p>}
      {chat.error && (
        <p role="alert" className="notice">
          {chat.error}
        </p>
      )}
    </aside>
  );
}
