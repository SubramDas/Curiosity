import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Video } from "../../types";
import {
  createClassificationClient,
  type ClassificationEntry,
} from "./classification-client";

const ClassificationContext = createContext<ReturnType<
  typeof createClassificationClient
> | null>(null);
const empty = new Map<string, ClassificationEntry>();
const noopSubscribe = () => () => {};
const emptySnapshot = () => empty;
export function ClassificationProvider({ children }: { children: ReactNode }) {
  const client = useMemo(createClassificationClient, []);
  useEffect(() => {
    client.start();
    return () => client.dispose();
  }, [client]);
  return (
    <ClassificationContext.Provider value={client}>
      {children}
    </ClassificationContext.Provider>
  );
}
export function useClassifiedVideos(videos: Video[]) {
  const client = useContext(ClassificationContext);
  const snapshot = useSyncExternalStore(
    client?.subscribe ?? noopSubscribe,
    client?.getSnapshot ?? emptySnapshot,
  );
  return useMemo(
    () =>
      videos.map((video) => {
        const row = snapshot.get(video.id);
        return !video.classification && row?.classification
          ? { ...video, classification: row.classification }
          : video;
      }),
    [videos, snapshot],
  );
}
export function useClassificationEntry(id: string) {
  const client = useContext(ClassificationContext);
  const snapshot = useSyncExternalStore(
    client?.subscribe ?? noopSubscribe,
    client?.getSnapshot ?? emptySnapshot,
  );
  return { entry: snapshot.get(id), retry: () => client?.retry(id) };
}

export function useVisibleClassification(video: Video) {
  const client = useContext(ClassificationContext);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!client || video.classification || !ref.current) return;
    const owner = Symbol(video.id);
    const target =
      ref.current.closest(
        ".video-result, .short-card, .player-section, .related-video, .classification-candidate",
      ) ?? ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => client.setVisible(video, owner, entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      client.setVisible(video, owner, false);
    };
  }, [client, video.id, video.classification]);
  return ref;
}
