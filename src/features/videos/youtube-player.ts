export interface Player {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  mute(): void;
  destroy(): void;
  pauseVideo(): void;
}
interface PlayerOptions {
  videoId: string;
  width: string;
  height: string;
  playerVars: { origin: string; playsinline: number; start?: number };
  events: {
    onReady?: (event: { target: Player }) => void;
    onStateChange: (event: { data: number }) => void;
    onError: (event: { data: number }) => void;
  };
}
declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: PlayerOptions) => Player;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<void> | null = null;
export function loadYouTubePlayer(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("YouTube player loading timed out.")),
      15_000,
    );
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("The YouTube player could not load."));
    };
    document.head.append(script);
  });
  return loading;
}
