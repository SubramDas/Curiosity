import { useLayoutEffect, useRef, useState } from "react";
import type { ChatTurn } from "./useTutorChat";

export function useConversationScroll(turns: ChatTurn[]) {
  const conversation = useRef<HTMLDivElement>(null);
  const readingEarlier = useRef(false);
  const [unread, setUnread] = useState(0);
  const latest = turns.at(-1);
  function showLatest() {
    const container = conversation.current;
    const answer = container?.lastElementChild as HTMLElement | null;
    if (container && answer) container.scrollTop = answer.offsetTop;
    readingEarlier.current = false;
    setUnread(0);
  }
  function onScroll() {
    const container = conversation.current;
    const answer = container?.lastElementChild as HTMLElement | null;
    if (!container || !answer) return;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      32;
    readingEarlier.current =
      !atBottom && container.scrollTop < answer.offsetTop - 32;
    if (!readingEarlier.current) setUnread(0);
  }
  useLayoutEffect(() => {
    if (!latest) {
      readingEarlier.current = false;
      setUnread(0);
      if (conversation.current) conversation.current.scrollTop = 0;
    } else if (readingEarlier.current) setUnread((count) => count + 1);
    else showLatest();
  }, [latest]);
  return { conversation, unread, onScroll, showLatest };
}
