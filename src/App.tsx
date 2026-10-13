import { useEffect, useState } from "react";
import { AccountPanel } from "./features/accounts/AccountPanel";
import { LearningWorkspace } from "./features/learning/LearningWorkspace";
import { Header } from "./features/navigation/Header";
import { Sidebar, type PageView } from "./features/navigation/Sidebar";
import { TopicFilters } from "./features/navigation/TopicFilters";
import { HomeFeed } from "./features/home/HomeFeed";
import { useHomeFeed } from "./features/home/useHomeFeed";
import { ContinueWatching } from "./features/progress/ContinueWatching";
import { useVideoProgress } from "./features/progress/useVideoProgress";
import {
  categories,
  classifyTopic,
  findSavedTopic,
  saveUniqueTopic,
} from "./features/topics/topic-rules";
import { useVideoSearch } from "./features/videos/useVideoSearch";
import { callApi } from "./lib/api";
import type { Topic, Video } from "./types";

const GUEST_STORE = "curiosity-guest-topics-v1";
function readGuestTopics(): Topic[] {
  try {
    const topics: unknown = JSON.parse(
      localStorage.getItem(GUEST_STORE) ?? "[]",
    );
    return Array.isArray(topics)
      ? topics.filter(
          (topic): topic is Topic =>
            topic &&
            typeof topic.key === "string" &&
            typeof topic.query === "string" &&
            topic.category in categories &&
            Array.isArray(topic.relatedCategories) &&
            topic.relatedCategories.every((id: string) => id in categories),
        )
      : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [query, setQuery] = useState("");
  const [topics, setTopics] = useState<Topic[]>(readGuestTopics);
  const [token, setToken] = useState<string | undefined>();
  const [supabaseEnabled, setSupabaseEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [ambiguous, setAmbiguous] = useState(false);
  const [demo, setDemo] = useState(false);
  const [view, setView] = useState<PageView>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [initialVideo, setInitialVideo] = useState<Video>();
  const [discovery, setDiscovery] = useState<{
    topic: Topic;
    videos: Video[];
  }>();
  const search = useVideoSearch();
  const progress = useVideoProgress(token);
  const home = useHomeFeed(
    topics,
    view === "home" || (view === "shorts" && !search.topic),
  );
  const homeVideos = [
    ...new Map(
      [
        ...home.trending,
        ...home.recommendations.flatMap((group) => group.videos),
      ].map((video) => [video.id, video]),
    ).values(),
  ];
  const currentTopic = discovery?.topic ?? search.topic;
  const currentVideos = discovery?.videos ?? search.videos;
  useEffect(() => {
    callApi<{ supabaseConfigured: boolean }>("config")
      .then((config) => setSupabaseEnabled(config.supabaseConfigured))
      .catch(() =>
        setMessage("The local API is unavailable. Restart npm run dev."),
      );
  }, []);
  useEffect(() => {
    if (token) return;
    try {
      localStorage.setItem(GUEST_STORE, JSON.stringify(topics));
    } catch {
      setMessage(
        "Browser storage is unavailable. These guest topics will not survive a refresh.",
      );
    }
  }, [topics, token]);
  function navigate(next: PageView) {
    if (next === "shorts" && view === "home")
      setDiscovery({
        topic: classifyTopic("Trending learning videos")!,
        videos: homeVideos,
      });
    setView(next);
    setMenuOpen(false);
    setInitialVideo(undefined);
    if (next === "home") setDiscovery(undefined);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function openTopic(topic: Topic, video?: Video) {
    if (search.busy) return;
    const chosen = findSavedTopic(topics, topic) ?? topic;
    setDiscovery(undefined);
    setInitialVideo(video);
    setView("topic");
    setMenuOpen(false);
    setQuery(chosen.query);
    if (!(await search.load(chosen))) return;
    if (token) {
      try {
        await callApi("topics/save", chosen, token);
        setTopics((current) => saveUniqueTopic(current, chosen));
        setMessage("Saved to your account.");
      } catch (error) {
        setMessage(
          `Search works, but saving failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else {
      setTopics((current) => saveUniqueTopic(current, chosen));
      setMessage("Saved in this browser as a guest topic.");
    }
  }
  function openVideo(video: Video, topic?: Topic, savedKey?: string) {
    if (topic) {
      void openTopic(topic, video);
      return;
    }
    // Opening a Trending video is not a search: it does not create a saved topic.
    const derived =
      classifyTopic(video.title) ?? classifyTopic("Trending learning videos")!;
    const savedCategory = savedKey?.split(":")[0] as Topic["category"];
    const chosen = savedKey
      ? {
          ...derived,
          key: savedKey,
          category:
            savedCategory in categories ? savedCategory : derived.category,
        }
      : derived;
    setDiscovery({ topic: chosen, videos: homeVideos });
    setInitialVideo(video);
    setView("topic");
  }
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const topic = classifyTopic(query);
    if (!topic) {
      setAmbiguous(true);
      return;
    }
    setAmbiguous(false);
    void openTopic(topic);
  }
  async function signIn(accessToken: string) {
    const rows = await callApi<
      {
        topic_key: string;
        query: string;
        category: Topic["category"];
        related_categories: Topic["relatedCategories"];
      }[]
    >("topics/list", {}, accessToken);
    setToken(accessToken);
    setTopics(
      rows.map((row) => ({
        key: row.topic_key,
        query: row.query,
        category: row.category,
        relatedCategories: row.related_categories,
      })),
    );
  }
  function signOut() {
    setToken(undefined);
    setTopics(readGuestTopics());
    setMessage("Signed out in this tab.");
  }
  function askQuestion() {
    if (currentTopic) {
      setView("topic");
      setMenuOpen(false);
      setTimeout(() => document.getElementById("question")?.focus(), 50);
    } else {
      setMessage(
        "Search a topic first, then ask a question beside its videos.",
      );
      document.getElementById("search")?.focus();
    }
  }
  const workspaceTopic =
    currentTopic ?? classifyTopic("Trending learning videos")!;
  const workspaceVideos = currentTopic ? currentVideos : homeVideos;
  return (
    <>
      <Header
        query={query}
        onQuery={setQuery}
        onSearch={submit}
        busy={search.busy}
        menuOpen={menuOpen}
        onMenu={() => setMenuOpen((value) => !value)}
        onHome={() => navigate("home")}
        account={
          <AccountPanel
            enabled={supabaseEnabled}
            signedIn={Boolean(token)}
            onSignIn={signIn}
            onSignOut={signOut}
          />
        }
      />
      {menuOpen && (
        <button
          className="navigation-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Sidebar
        topics={topics}
        view={view}
        open={menuOpen}
        onNavigate={navigate}
        onTopic={(topic) => void openTopic(topic)}
        onAsk={askQuestion}
        demo={demo}
        onDemo={setDemo}
      />
      <main className="main-content">
        <TopicFilters
          topics={topics}
          active={
            (view === "topic" || view === "shorts") &&
            topics.some((topic) => topic.category === currentTopic?.category)
              ? currentTopic?.category
              : undefined
          }
          onTrending={() => navigate("home")}
          onTopic={(topic) => void openTopic(topic)}
        />
        {ambiguous && (
          <aside className="notice">
            <p>What do you mean by CA?</p>
            {["Chartered accountant", "California"].map((choice) => (
              <button
                key={choice}
                onClick={() => {
                  setAmbiguous(false);
                  void openTopic(classifyTopic(choice)!);
                }}
              >
                {choice}
              </button>
            ))}
          </aside>
        )}
        {message && (
          <p className="status-message" role="status">
            {message}
          </p>
        )}
        {view === "home" && (
          <>
            {progress.message && (
              <p className="notice" role="status">
                {progress.message}
              </p>
            )}
            <ContinueWatching
              limit={3}
              onViewAll={() => navigate("history")}
              rows={progress.rows}
              videos={homeVideos}
              onSelect={(video, key) =>
                openVideo(
                  video,
                  topics.find((topic) => topic.key === key),
                  key,
                )
              }
            />
            <div className="suggestions">
              <span>Try a topic</span>
              {[
                ["GPUs", "I want to know about GPUs"],
                ["Income tax", "Income tax"],
                ["Cooking", "Cooking"],
              ].map(([label, text]) => (
                <button
                  key={label}
                  disabled={search.busy}
                  onClick={() => void openTopic(classifyTopic(text)!)}
                >
                  {label}
                </button>
              ))}
            </div>
            {home.busy && (
              <div className="feed-loading" role="status">
                <div className="skeleton-grid">
                  {[1, 2, 3].map((id) => (
                    <div className="skeleton-card" key={id} />
                  ))}
                </div>
                <p>Finding videos for your feed…</p>
              </div>
            )}
            {home.error && (
              <p className="notice" role="alert">
                {home.error} <button onClick={home.retry}>Try again</button>
              </p>
            )}
            {home.messages.map((text) => (
              <p className="notice" key={text} role="status">
                {text} <button onClick={home.retry}>Try again</button>
              </p>
            ))}
            {!home.busy && (
              <HomeFeed
                data={home}
                topics={topics}
                progress={progress.rows}
                onSelect={openVideo}
              />
            )}
          </>
        )}
        {view === "history" && (
          <section className="feed-section">
            <h1>Continue watching</h1>
            <p className="muted">Pick up a video where you left off.</p>
            {progress.loading ? (
              <p role="status">Loading your video progress…</p>
            ) : (
              <ContinueWatching
                rows={progress.rows}
                videos={[...homeVideos, ...search.videos]}
                onSelect={(video, key) =>
                  openVideo(
                    video,
                    topics.find((topic) => topic.key === key),
                    key,
                  )
                }
              />
            )}
            {progress.message && (
              <p className="notice" role="status">
                {progress.message}
              </p>
            )}
            {!progress.loading &&
              !progress.rows.some(
                (row) => !row.completed && row.position_seconds > 0,
              ) && (
                <p className="empty-state">
                  Your unfinished videos will appear here after you start
                  watching.
                </p>
              )}
          </section>
        )}
        {(view === "topic" || view === "shorts") && (
          <>
            {search.error && (
              <p className="notice" role="alert">
                {search.error}
              </p>
            )}
            {search.busy && <p role="status">Finding videos…</p>}
            <LearningWorkspace
              key={`${workspaceTopic.key}:${demo}:${token ? "account" : "guest"}:${initialVideo?.id ?? ""}:${view}`}
              topic={workspaceTopic}
              videos={workspaceVideos}
              demo={demo}
              progress={progress}
              initialVideo={initialVideo}
              initialMode={view === "shorts" ? "short" : "all"}
            />
            {!discovery && search.nextPage && (
              <button
                className="load-more"
                disabled={search.busy}
                onClick={() => void search.load(search.topic!, true)}
              >
                {search.busy ? "Loading…" : "Load more videos"}
              </button>
            )}
            {!search.busy && !workspaceVideos.length && (
              <p className="empty-state">
                No videos returned. Try a clearer search.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
