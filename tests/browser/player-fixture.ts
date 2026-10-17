export async function mockPlayer(page: import("@playwright/test").Page) {
  await page.route("**/api/search/session", (route) =>
    route.fulfill({ json: { permit: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" } }),
  );
  await page.addInitScript(() => {
    const state = window as unknown as {
      YT: unknown;
      mockPlayers: {
        id: string;
        position: number;
        destroyed: boolean;
        playing: boolean;
        muted: boolean;
        blockAutoplay: () => void;
        seeks: number[];
        pause: () => void;
        finish: () => void;
      }[];
    };
    state.mockPlayers = [];
    state.YT = {
      Player: class {
        id: string;
        position = 0;
        destroyed = false;
        playing = false;
        muted = true;
        seeks: number[] = [];
        constructor(
          host: HTMLElement,
          private options: {
            videoId: string;
            events: {
              onAutoplayBlocked?: () => void;
              onReady: (e: unknown) => void;
              onStateChange: (e: { data: number }) => void;
            };
          },
        ) {
          this.id = options.videoId;
          host.textContent = `Mock player ${this.id}`;
          state.mockPlayers.push(this);
          setTimeout(() => options.events.onReady({ target: this }), 50);
        }
        getCurrentTime() {
          return this.position;
        }
        getDuration() {
          return 234;
        }
        seekTo(seconds: number) {
          this.position = seconds;
          this.seeks.push(seconds);
        }
        cueVideoById({ startSeconds }: { startSeconds: number }) {
          this.position = startSeconds;
          this.seeks.push(startSeconds);
        }
        unMute() {
          this.muted = false;
        }
        blockAutoplay() {
          this.pauseVideo();
          this.options.events.onAutoplayBlocked?.();
        }
        playVideo() {
          this.playing = true;
          this.options.events.onStateChange({ data: 1 });
        }
        pauseVideo() {
          this.playing = false;
          this.options.events.onStateChange({ data: 2 });
        }
        pause() {
          this.position = 72;
          this.pauseVideo();
        }
        finish() {
          this.position = 234;
          this.options.events.onStateChange({ data: 0 });
        }
        destroy() {
          this.destroyed = true;
          this.playing = false;
        }
      },
    };
  });
}
