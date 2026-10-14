import type { ReactNode } from "react";
import type { Video } from "../shared/types";

export function MobileLearningLayout({
  feed,
  chat,
  currentVideo,
  chatOpen,
  onAsk,
  onCloseChat,
}: {
  feed: ReactNode;
  chat: ReactNode;
  currentVideo: Video | null;
  chatOpen: boolean;
  onAsk: () => void;
  onCloseChat: () => void;
}) {
  return (
    <div className="mobile-learning-layout">
      <div className="mobile-learning-feed" hidden={chatOpen}>
        {feed}
        <button className="mobile-ask-video" onClick={onAsk}>
          {currentVideo ? "Ask about this video" : "Ask your teacher"}
        </button>
      </div>
      <div className="mobile-chat-screen" hidden={!chatOpen}>
        {currentVideo && (
          <button
            className="mobile-video-context secondary"
            onClick={onCloseChat}
          >
            Watching: {currentVideo.title}
            <span>Back to video →</span>
          </button>
        )}
        {chat}
      </div>
    </div>
  );
}
