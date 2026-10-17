import { activeMilliseconds } from "./playback-activity";
import { graphCall, isNode, isProgress, isUuid } from "./graph-client";
import type { GraphNode, PlaybackSample, TopicProgress } from "./graph-types";
interface Activity {
  owner: string;
  videoId: string;
  topic: GraphNode | null;
  previous: PlaybackSample | null;
  elapsed: number;
  reported: number;
  sequence: number;
  session: string | null;
  request: string;
  active: boolean;
  blocked: boolean;
  scheduled: boolean;
  force: boolean;
}
interface Dependencies {
  token: () => string | undefined;
  ready: () => boolean;
  progress: () => TopicProgress[];
  apply: (p: TopicProgress) => boolean;
  guestCredit: (topic: GraphNode, ms: number) => void;
  award: (topic: GraphNode) => void;
  association: (videoId: string, topic: GraphNode) => void;
  message: (text: string) => void;
}
// One coordinator chooses a player and serializes all account activity requests.
export function createActivityController(deps: Dependencies) {
  let current: Activity | null = null,
    disposed = false,
    queue = Promise.resolve();
  const matches = new Map<string, GraphNode | null>();
  function enqueue(task: () => Promise<void>) {
    queue = queue
      .then(async () => {
        if (!disposed) await task();
      })
      .catch(() => {
        if (!disposed)
          deps.message("Playback tracking could not sync. Retry manually.");
      });
  }
  function explored(a: Activity) {
    return Boolean(
      a.topic &&
      deps
        .progress()
        .some((p) => p.topic_id === a.topic!.id && p.first_explored_at),
    );
  }
  function fail(a: Activity, e: unknown) {
    a.blocked = true;
    if (!disposed)
      deps.message(
        e instanceof Error ? e.message : "Playback tracking could not sync.",
      );
  }
  function flush(a = current, force = false) {
    if (!a || !deps.token()) return;
    a.force ||= force;
    if (a.scheduled) return;
    a.scheduled = true;
    enqueue(async () => {
      a.scheduled = false;
      const forced = a.force;
      a.force = false;
      const token = deps.token();
      if (
        !token ||
        !deps.ready() ||
        !a.topic ||
        a.blocked ||
        explored(a) ||
        (!a.active && !forced)
      )
        return;
      try {
        if (!a.session) {
          if (!a.active || current !== a) return;
          const started = await graphCall<{
            sessionId?: string;
            busy?: boolean;
          }>(
            "activity/start",
            { topicId: a.topic.id, videoId: a.videoId, requestId: a.request },
            token,
          );
          if (started.busy)
            throw Error(
              "Another tab is tracking playback. Pause it, wait up to 45 seconds, then retry here.",
            );
          if (!isUuid(started.sessionId))
            throw Error("The viewing session was invalid.");
          a.session = started.sessionId;
          if (disposed) {
            await graphCall(
              "activity/stop",
              { sessionId: a.session },
              token,
            ).catch(() => {});
            return;
          }
          a.elapsed = 0;
          a.reported = 0;
          a.previous = null;
          return;
        }
        const elapsed = Math.floor(a.elapsed);
        if (elapsed === a.reported) return;
        const sequence = a.sequence + 1;
        const r = await graphCall<{
          expired?: boolean;
          topicId: string;
          sequence: number;
          activeViewingMs: number;
          firstExploredAt: string | null;
          newlyExplored: boolean;
        }>(
          "activity/report",
          { sessionId: a.session, sequence, activeMs: elapsed },
          token,
        );
        if (disposed) return;
        if (r.expired)
          throw Error(
            "Playback tracking expired. Retry to start a fresh interval.",
          );
        if (r.topicId !== a.topic.id || r.sequence !== sequence)
          throw Error("The viewing acknowledgement was invalid.");
        const old = deps.progress().find((p) => p.topic_id === a.topic!.id);
        const p = {
          topic_id: r.topicId,
          active_viewing_ms: r.activeViewingMs,
          first_explored_at: r.firstExploredAt,
          discovered_at: old?.discovered_at ?? new Date().toISOString(),
        };
        if (!isProgress(p))
          throw Error("The saved viewing progress was invalid.");
        a.sequence = sequence;
        a.reported = elapsed;
        deps.apply(p);
        if (r.newlyExplored && !old?.first_explored_at) deps.award(a.topic);
        deps.message("");
      } catch (e) {
        fail(a, e);
      }
    });
  }
  function close(a: Activity) {
    flush(a, true);
    enqueue(async () => {
      const token = deps.token();
      if (a.session && token) {
        try {
          await graphCall("activity/stop", { sessionId: a.session }, token);
        } catch (e) {
          fail(a, e);
        }
      }
    });
  }
  function sample(s: PlaybackSample) {
    if (disposed) return;
    if (!s.active) {
      if (current?.owner === s.owner) {
        current.active = false;
        current.previous = null;
        flush(current, true);
      }
      return;
    }
    if (current && current.owner !== s.owner && s.kind === "tick") return;
    if (
      !current ||
      current.videoId !== s.videoId ||
      current.owner !== s.owner
    ) {
      if (current) close(current);
      const a: Activity = {
        owner: s.owner,
        videoId: s.videoId,
        topic: null,
        previous: s,
        elapsed: 0,
        reported: 0,
        sequence: 0,
        session: null,
        request: crypto.randomUUID(),
        active: true,
        blocked: false,
        scheduled: false,
        force: false,
      };
      current = a;
      const assign = (topic: GraphNode | null) => {
        if (disposed || current !== a) return;
        a.topic = topic;
        a.previous = null;
        if (topic) deps.association(a.videoId, topic);
        flush(a);
      };
      if (matches.has(s.videoId)) assign(matches.get(s.videoId) ?? null);
      else
        void graphCall<{ topic: unknown }>("video-match", {
          videoId: s.videoId,
        })
          .then((r) => {
            if (r.topic !== null && !isNode(r.topic))
              throw Error("Invalid video association.");
            const n = r.topic as GraphNode | null;
            if (matches.size >= 200)
              matches.delete(matches.keys().next().value!);
            matches.set(s.videoId, n);
            assign(n);
          })
          .catch((e) => {
            if (!disposed && current === a) fail(a, e);
          });
      return;
    }
    const a = current,
      delta = activeMilliseconds(a.previous, s);
    a.active = true;
    a.previous = s;
    if (!delta || !a.topic || a.blocked || explored(a) || !deps.ready()) return;
    if (!deps.token()) {
      deps.guestCredit(a.topic, delta);
      return;
    }
    if (!a.session) {
      flush(a);
      return;
    }
    a.elapsed = Math.min(3600000, a.elapsed + delta);
    const saved =
      deps.progress().find((p) => p.topic_id === a.topic!.id)
        ?.active_viewing_ms ?? 0;
    if (saved + a.elapsed - a.reported >= 30000) flush(a);
  }
  return {
    sample,
    flush: () => flush(),
    retry() {
      if (current) {
        const old = current;
        close(old);
        current = {
          ...old,
          session: null,
          request: old.session ? crypto.randomUUID() : old.request,
          previous: null,
          elapsed: 0,
          reported: 0,
          sequence: 0,
          blocked: false,
          scheduled: false,
          force: false,
        };
        if (!current.topic) matches.delete(current.videoId);
        if (!current.topic) {
          current = null;
          return;
        }
        flush(current);
      }
    },
    dispose() {
      disposed = true;
      const a = current;
      current = null;
      if (a?.session && deps.token())
        void graphCall(
          "activity/stop",
          { sessionId: a.session },
          deps.token(),
        ).catch(() => {});
    },
  };
}
