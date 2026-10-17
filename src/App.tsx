import { RelatedUniversesRendererContext } from "../shared/features/classification/RelatedUniversesRendererContext";
import { renderDesktopRelatedUniverses } from "../desktop-ui/features/classification/RelatedUniversesPopover";
import { WatchHistory } from "../desktop-ui/features/history/WatchHistory";
import type { VideoProgress } from "../shared/features/progress/useVideoProgress";
import { DesktopLearningLayout } from "../desktop-ui/features/chat/DesktopLearningLayout";
import { DesktopSearchLayout } from "../desktop-ui/features/search/DesktopSearchLayout";
import { SearchWorkspace } from "../shared/features/search/SearchWorkspace";
import { VideoResults } from "../shared/features/videos/VideoResults";
import type { GraphNode } from "../shared/features/graph/graph-types";
import { lazy, Suspense } from "react";
import { GraphProvider } from "../shared/features/graph/GraphProvider";

import { UniverseFeed } from "../desktop-ui/features/universes/UniverseFeed";
import { UniverseFilters } from "../desktop-ui/features/universes/UniverseNavigation";
import { desktopVideoPresentation } from "../desktop-ui/features/universes/VideoUniverseLabel";
import {
  topicUniverse,
  universes,
  type UniverseId,
} from "../shared/features/universes/universe-rules";
import { MobileLayout } from "../mobile-ui/MobileLayout";
import { MobileHeader } from "../mobile-ui/MobileHeader";
import { MobileNavigation } from "../mobile-ui/MobileNavigation";
import { MobileMenu } from "../mobile-ui/MobileMenu";
import { MobileTopics } from "../mobile-ui/MobileTopics";
import { MobileSearchSuggestions } from "../mobile-ui/MobileSearchSuggestions";
import { MobileLearningLayout } from "../mobile-ui/MobileLearningLayout";
import { useMediaQuery } from "../shared/lib/useMediaQuery";
import { DesktopLayout } from "../desktop-ui/DesktopLayout";
import { useEffect, useRef, useState } from "react";
import { useTutorChat } from "../shared/features/chat/useTutorChat";
import { useAccountSession } from "../shared/features/accounts/useAccountSession";
import { AccountPanel } from "../shared/features/accounts/AccountPanel";
import { LearningWorkspace } from "../shared/features/learning/LearningWorkspace";
import { Header } from "../desktop-ui/components/Header";
import { Sidebar } from "../desktop-ui/components/Sidebar";
import { TopicFilters } from "../desktop-ui/components/TopicFilters";
import { HomeFeed } from "../shared/features/home/HomeFeed";
import { useHomeFeed } from "../shared/features/home/useHomeFeed";
import { ContinueWatching } from "../shared/features/progress/ContinueWatching";
import { useVideoProgress } from "../shared/features/progress/useVideoProgress";
import {
  categories,
  classifyTopic,
  findSavedTopic,
  saveUniqueTopic,
} from "../shared/features/topics/topic-rules";
import { useVideoSearch } from "../shared/features/videos/useVideoSearch";
import { callApi } from "../shared/lib/api";
import type { PageView, Topic, Video, VideoSeekRequest } from "../shared/types";

const GraphPage = lazy(() =>
  import("../desktop-ui/features/graph/GraphPage").then((m) => ({
    default: m.GraphPage,
  })),
);
const MobileGraphPage = lazy(() =>
  import("../mobile-ui/features/graph/MobileGraphPage").then((m) => ({
    default: m.MobileGraphPage,
  })),
);

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
  const isMobile = useMediaQuery(
    "(max-width: 600px), (max-width: 900px) and (max-height: 500px)",
  );
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [topics, setTopics] = useState<Topic[]>(readGuestTopics);
  const account = useAccountSession();
  const chat = useTutorChat(account.userId);
  const token = account.token;
  const [graphEntry, setGraphEntry] = useState<
    GraphNode & { requestId: string }
  >();
  const [graphEnabled, setGraphEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    void callApi<{ learningGraphEnabled?: boolean }>("config")
      .then((c) => {
        if (active) setGraphEnabled(c.learningGraphEnabled === true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const currentToken = useRef(token);
  currentToken.current = token;
  const [topicsBelongToAccount, setTopicsBelongToAccount] = useState(false);
  const [message, setMessage] = useState("");
  const [ambiguous, setAmbiguous] = useState(false);
  const [demo, setDemo] = useState(false);
  const [view, setView] = useState<PageView>("home");
  const [activeUniverse, setActiveUniverse] = useState<UniverseId>();
  const presentation = isMobile ? undefined : desktopVideoPresentation;
  useEffect(() => {
    if (isMobile && (view === "universe" || view === "search")) {
      setView("home");
      setActiveUniverse(undefined);
    }
  }, [isMobile, view]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [initialVideo, setInitialVideo] = useState<Video>();
  const [historyPlayback, setHistoryPlayback] = useState<VideoProgress | null>(
    null,
  );
  const [initialSeek, setInitialSeek] = useState<VideoSeekRequest>();
  const [discovery, setDiscovery] = useState<{
    topic: Topic;
    videos: Video[];
    searchId?: number;
  }>();
  const search = useVideoSearch({ background: !isMobile });
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
  // A search selection keeps receiving checked results without replacing the player.
  const currentVideos =
    discovery?.searchId === search.searchId
      ? [
          ...new Map(
            [...discovery.videos, ...search.videos].map((video) => [
              video.id,
              video,
            ]),
          ).values(),
        ]
      : (discovery?.videos ?? search.videos);
  useEffect(() => {
    if (token || !account.ready || topicsBelongToAccount) return;
    try {
      localStorage.setItem(GUEST_STORE, JSON.stringify(topics));
    } catch {
      setMessage(
        "Browser storage is unavailable. These guest topics will not survive a refresh.",
      );
    }
  }, [topics, token, account.ready, topicsBelongToAccount]);
  function openUniverse(id: UniverseId) {
    search.reset();
    setDiscovery(undefined);
    setInitialVideo(undefined);
    setInitialSeek(undefined);
    setActiveUniverse(id);
    setView("universe");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function navigate(next: PageView) {
    setHistoryPlayback(null);
    if (search.busy) search.reset();
    setGraphEntry(undefined);
    setActiveUniverse(undefined);
    setMobileChatOpen(false);
    setMobileSearchOpen(false);
    if (next === "shorts" && view === "home")
      setDiscovery({
        topic: classifyTopic("Trending learning videos")!,
        videos: homeVideos,
      });
    setView(next);
    setMenuOpen(false);
    setInitialSeek(undefined);
    setInitialVideo(undefined);
    if (next === "home") setDiscovery(undefined);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openSearch() {
    if (isMobile || view === "search") return;
    search.reset();
    setDiscovery(undefined);
    setInitialVideo(undefined);
    setInitialSeek(undefined);
    setActiveUniverse(undefined);
    setMessage("");
    setAmbiguous(false);
    setView("search");
    setMenuOpen(false);
  }
  function changeSearch() {
    search.reset();
    setMessage("");
    document.getElementById("search")?.focus();
  }
  function searchQuery(value: string) {
    const topic = classifyTopic(value) ?? {
      key: `general:${value.trim().toLowerCase()}`,
      query: value.trim(),
      category: "general" as const,
      relatedCategories: [],
    };
    void openTopic(topic);
  }
  async function openTopic(topic: Topic, video?: Video, goal = "") {
    if (search.busy) return;
    setMobileChatOpen(false);
    setMobileSearchOpen(false);
    const chosen = findSavedTopic(topics, topic) ?? topic;
    setActiveUniverse(undefined);
    setDiscovery(undefined);
    setInitialVideo(video);
    setView(isMobile ? "topic" : "search");
    setMenuOpen(false);
    setMessage("");
    setQuery(chosen.query);
    if (!(await search.load(chosen, false, goal))) return;
    const savedTopic = goal ? (classifyTopic(goal) ?? chosen) : chosen;
    setQuery(savedTopic.query);
    if (token) {
      try {
        await callApi("topics/save", savedTopic, token);
        if (currentToken.current !== token) return;
        setTopics((current) => saveUniqueTopic(current, savedTopic));
        setMessage("Saved to your account.");
      } catch (error) {
        setMessage(
          `Search works, but saving failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else {
      setTopics((current) => saveUniqueTopic(current, savedTopic));
      setMessage("Saved in this browser as a guest topic.");
    }
  }
  function openVideo(
    video: Video,
    topic?: Topic,
    savedKey?: string,
    relatedVideos?: Video[],
  ) {
    setHistoryPlayback(null);
    setMobileChatOpen(false);
    setMobileSearchOpen(false);
    setInitialSeek(undefined);
    if (isMobile && topic && !savedKey) {
      void openTopic(topic, video);
      return;
    }
    // Opening a Trending video is not a search: it does not create a saved topic.
    const derived =
      classifyTopic(video.title) ?? classifyTopic("Trending learning videos")!;
    const savedCategory = savedKey?.split(":")[0] as Topic["category"];
    const chosen =
      topic ??
      (savedKey
        ? {
            ...derived,
            key: savedKey,
            category:
              savedCategory in categories ? savedCategory : derived.category,
          }
        : derived);
    const related = savedKey
      ? search.topic?.key === chosen.key
        ? search.videos
        : []
      : (relatedVideos ?? homeVideos);
    setActiveUniverse(undefined);
    setDiscovery({
      topic: chosen,
      ...(related === search.videos ? { searchId: search.searchId } : {}),
      videos: [video, ...related.filter((item) => item.id !== video.id)],
    });
    setInitialVideo(video);
    setView("topic");
  }
  function openChatVideo(video: Video, seconds?: number) {
    openVideo(video);
    if (seconds !== undefined)
      setInitialSeek({ videoId: video.id, seconds, requestId: Date.now() });
  }
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const topic = classifyTopic(query);
    if (!topic && isMobile) {
      setAmbiguous(true);
      return;
    }
    setAmbiguous(false);
    searchQuery(query);
  }
  const previousAccount = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!account.ready || previousAccount.current === account.userId) return;
    previousAccount.current = account.userId;
    search.reset();
    setInitialSeek(undefined);
    setDiscovery(undefined);
    setInitialVideo(undefined);
    setQuery("");
    setMobileChatOpen(false);
    setMobileSearchOpen(false);
    setView("home");
    setActiveUniverse(undefined);
    setMenuOpen(false);
    setMessage("");
    setAmbiguous(false);
  }, [account.ready, account.userId, search.reset]);
  useEffect(() => {
    if (!account.ready) return;
    if (!token) {
      setTopics(readGuestTopics());
      setTopicsBelongToAccount(false);
      return;
    }
    let active = true;
    setTopicsBelongToAccount(true);
    setTopics([]);
    callApi<
      {
        topic_key: string;
        query: string;
        category: Topic["category"];
        related_categories: Topic["relatedCategories"];
      }[]
    >("topics/list", {}, token)
      .then((rows) => {
        if (!active) return;
        setTopics(
          rows.map((row) => ({
            key: row.topic_key,
            query: row.query,
            category: row.category,
            relatedCategories: row.related_categories,
          })),
        );
      })
      .catch(() => {
        if (active)
          setMessage(
            "You are signed in, but saved topics could not load. Check your connection and refresh.",
          );
      });
    return () => {
      active = false;
    };
  }, [token, account.ready]);
  function askQuestion() {
    if (search.busy) search.reset();
    setMobileChatOpen(true);
    setMobileSearchOpen(false);
    if (!currentTopic) {
      search.reset();
      setDiscovery({ topic: classifyTopic("Ask a question")!, videos: [] });
      setInitialVideo(undefined);
    }
    if (view !== "topic" && view !== "shorts") setView("topic");
    setMenuOpen(false);
    setMessage("");
    setTimeout(() => document.getElementById("question")?.focus(), 50);
  }
  function askGraphQuestion(label: string) {
    search.reset();
    setDiscovery({ topic: classifyTopic(label)!, videos: [] });
    setInitialVideo(undefined);
    setInitialSeek(undefined);
    setActiveUniverse(undefined);
    setView("topic");
    setMobileChatOpen(true);
    setMobileSearchOpen(false);
    setMenuOpen(false);
    setTimeout(() => document.getElementById("question")?.focus(), 50);
  }
  const workspaceTopic =
    currentTopic ?? classifyTopic("Trending learning videos")!;
  const workspaceVideos = currentTopic ? currentVideos : homeVideos;
  const Layout = isMobile ? MobileLayout : DesktopLayout;
  const PageHeader = isMobile ? MobileHeader : Header;
  const LearningGraphPage = isMobile ? MobileGraphPage : GraphPage;
  return (
    <GraphProvider
      key={account.ready ? (account.userId ?? "guest") : "loading"}
      token={token}
      enabled={graphEnabled && account.ready}
      onOpenTopic={(node) => {
        setGraphEntry({ ...node, requestId: crypto.randomUUID() });
        setActiveUniverse(undefined);
        setView("graph");
        setMenuOpen(false);
        setMobileChatOpen(false);
        setMobileSearchOpen(false);
      }}
    >
      <RelatedUniversesRendererContext
        value={isMobile ? null : renderDesktopRelatedUniverses}
      >
        <Layout
          {...{
            searchOpen: mobileSearchOpen,
            chatOpen: mobileChatOpen,
            navigation: (
              <MobileNavigation
                view={view}
                chatOpen={mobileChatOpen}
                onNavigate={navigate}
                onAsk={askQuestion}
              />
            ),
          }}
          menuOpen={menuOpen}
          onCloseMenu={() => setMenuOpen(false)}
          header={
            <PageHeader
              {...{
                searchOpen: mobileSearchOpen,
                onSearchOpen: isMobile
                  ? setMobileSearchOpen
                  : () => openSearch(),
                chatOpen: mobileChatOpen,
                onCloseChat: () => setMobileChatOpen(false),
              }}
              query={query}
              onQuery={setQuery}
              onSearch={submit}
              busy={search.busy}
              menuOpen={menuOpen}
              onMenu={() => setMenuOpen((value) => !value)}
              onHome={() => navigate("home")}
              account={
                <AccountPanel
                  isOpen={accountOpen}
                  onOpenChange={setAccountOpen}
                  presentation={isMobile ? "screen" : "popover"}
                  enabled={account.enabled}
                  ready={account.ready}
                  accountEmail={account.email}
                  accountError={account.error}
                  signedIn={Boolean(token)}
                  onAuthenticate={account.authenticate}
                  onResendConfirmation={account.resendConfirmation}
                  onSignOut={account.signOut}
                />
              }
            />
          }
          sidebar={
            isMobile ? (
              <MobileMenu
                graphEnabled={graphEnabled}
                open={menuOpen}
                onNavigate={navigate}
                onClose={() => setMenuOpen(false)}
                demo={demo}
                onDemo={setDemo}
              />
            ) : (
              <Sidebar
                graphEnabled={graphEnabled}
                topics={topics}
                view={view}
                open={menuOpen}
                onNavigate={navigate}
                onUniverse={openUniverse}
                onTopic={(topic) => void openTopic(topic)}
                activeUniverse={activeUniverse}
                onAsk={askQuestion}
                demo={demo}
                onDemo={setDemo}
              />
            )
          }
        >
          {isMobile && mobileSearchOpen && (
            <MobileSearchSuggestions
              topics={topics}
              onOpen={(topic) => void openTopic(topic)}
              onAsk={askQuestion}
            />
          )}
          {view !== "graph" &&
            (!isMobile ||
              (!mobileChatOpen &&
                view !== "topics" &&
                view !== "history" &&
                view !== "shorts")) &&
            (isMobile ? (
              <TopicFilters
                topics={topics}
                active={
                  (view === "topic" || view === "shorts") &&
                  topics.some(
                    (topic) => topic.category === currentTopic?.category,
                  )
                    ? currentTopic?.category
                    : undefined
                }
                onTrending={() => navigate("home")}
                onTopic={(topic) => void openTopic(topic)}
              />
            ) : (
              <UniverseFilters
                isTrending={view === "home"}
                active={view === "universe" ? activeUniverse : undefined}
                onSelect={openUniverse}
                onTrending={() => navigate("home")}
              />
            ))}
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
          {!isMobile && view === "search" && (
            <DesktopSearchLayout>
              <SearchWorkspace
                search={search}
                onChoose={searchQuery}
                onChange={changeSearch}
                onClarify={(goal) => {
                  if (search.topic)
                    void openTopic(search.topic, undefined, goal);
                }}
                onRetry={() => {
                  if (search.topic)
                    void openTopic(search.topic, undefined, search.goal);
                }}
              >
                <ContinueWatching
                  presentation={presentation}
                  rows={progress.rows}
                  topicKey={search.topic?.key}
                  videos={search.videos}
                  onSelect={(video, key) =>
                    openVideo(
                      video,
                      search.topic ?? undefined,
                      key,
                      search.videos,
                    )
                  }
                />
                <VideoResults
                  presentation={presentation}
                  videos={search.videos}
                  progress={progress.rows}
                  onSelect={(video) =>
                    openVideo(
                      video,
                      search.topic ?? undefined,
                      undefined,
                      search.videos,
                    )
                  }
                />
              </SearchWorkspace>
            </DesktopSearchLayout>
          )}
          {isMobile && view === "topics" && (
            <MobileTopics
              topics={topics}
              onOpen={(topic) => void openTopic(topic)}
              onSearch={() => setMobileSearchOpen(true)}
              onHistory={() => navigate("history")}
            />
          )}
          {isMobile && view === "home" && topics.length === 0 && (
            <section className="mobile-welcome">
              <h1>Follow your curiosity.</h1>
              <p>
                Videos to explore. A teacher to ask.
                <br />
                Your topics, kept together.
              </p>
              <button onClick={() => setMobileSearchOpen(true)}>
                Search anything
              </button>
            </section>
          )}
          {!isMobile && view === "universe" && activeUniverse && (
            <UniverseFeed
              key={activeUniverse}
              universe={activeUniverse}
              topics={topics}
              progress={progress.rows}
              onSelect={(video, videos) =>
                openVideo(video, undefined, undefined, videos)
              }
              onTopic={(topic) => void openTopic(topic)}
            />
          )}
          {view === "graph" && graphEnabled && (
            <Suspense fallback={<p role="status">Opening Explore map…</p>}>
              <LearningGraphPage
                key={
                  graphEntry
                    ? `${graphEntry.id}:${graphEntry.requestId}`
                    : "restore"
                }
                entry={
                  graphEntry
                    ? {
                        id: graphEntry.id,
                        universe: graphEntry.primaryUniverse,
                      }
                    : undefined
                }
                token={token}
                progress={progress.rows}
                onSave={progress.save}
                onAsk={askGraphQuestion}
                onSearch={(label) => {
                  const topic = classifyTopic(label);
                  if (topic) void openTopic(topic);
                }}
              />
            </Suspense>
          )}
          {view === "home" && (
            <>
              {graphEnabled && (
                <section className="graph-entry-card">
                  <div>
                    <h2>See where an idea can take you.</h2>
                    <p>
                      Open your learning map and follow connections between
                      topics.
                    </p>
                  </div>
                  <button onClick={() => navigate("graph")}>
                    Explore map →
                  </button>
                </section>
              )}
              {progress.message && (
                <p className="notice" role="status">
                  {progress.message}
                </p>
              )}
              <ContinueWatching
                presentation={presentation}
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
                  presentation={presentation}
                  data={home}
                  topics={topics}
                  progress={progress.rows}
                  onSelect={openVideo}
                />
              )}
            </>
          )}
          {view === "history" && !isMobile && (
            <WatchHistory
              key={token ?? "guest"}
              rows={progress.rows}
              videos={[...homeVideos, ...search.videos]}
              loading={progress.loading}
              message={progress.message}
              onSelect={(video, row) => {
                openVideo(
                  video,
                  topics.find((topic) => topic.key === row.topic_key),
                  row.topic_key,
                );
                setHistoryPlayback(row);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
            />
          )}
          {view === "history" && isMobile && (
            <section className="feed-section">
              <h1>Continue watching</h1>
              <p className="muted">Pick up a video where you left off.</p>
              {progress.loading ? (
                <p role="status">Loading your video progress…</p>
              ) : (
                <ContinueWatching
                  presentation={presentation}
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
              {!isMobile &&
                historyPlayback &&
                initialVideo?.id === historyPlayback.video_id && (
                  <div className="watch-history-return">
                    <button
                      className="secondary"
                      onClick={() => navigate("history")}
                    >
                      ← Watch history
                    </button>
                    <span>
                      {historyPlayback.completed
                        ? "Watching again from the beginning"
                        : "Picking up where you left off"}
                    </span>
                  </div>
                )}
              {search.error && (
                <p className="notice" role="alert">
                  {search.error}
                  {isMobile && (
                    <>
                      <button onClick={() => setMobileSearchOpen(true)}>
                        Change search
                      </button>
                      <button onClick={() => navigate("history")}>
                        Continue watching
                      </button>
                    </>
                  )}
                </p>
              )}
              {search.busy && <p role="status">Finding videos…</p>}
              <LearningWorkspace
                allowChatExpansion={!isMobile}
                showResumeRow={isMobile || !historyPlayback}
                presentation={
                  isMobile || !historyPlayback
                    ? presentation
                    : { ...presentation, scrollOnOpen: false }
                }
                headingLabel={
                  !isMobile
                    ? topicUniverse(workspaceTopic)
                      ? universes[topicUniverse(workspaceTopic)!].name
                      : ""
                    : undefined
                }
                key={`${workspaceTopic.key}:${demo}:${token ? "account" : "guest"}:${initialVideo?.id ?? ""}:${view}`}
                showReelControls={isMobile}
                feedHidden={isMobile && mobileChatOpen}
                onReturnToVideo={
                  isMobile ? () => setMobileChatOpen(false) : undefined
                }
                renderContent={
                  isMobile
                    ? (content) => (
                        <MobileLearningLayout
                          {...content}
                          chatOpen={mobileChatOpen}
                          onAsk={askQuestion}
                          onCloseChat={() => setMobileChatOpen(false)}
                        />
                      )
                    : (content) => <DesktopLearningLayout {...content} />
                }
                topic={workspaceTopic}
                videos={workspaceVideos}
                demo={demo}
                progress={progress}
                chat={chat}
                onRelatedVideo={openChatVideo}
                initialSeek={initialSeek}
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
              {!search.busy && !workspaceVideos.length && !discovery && (
                <p className="empty-state">
                  No videos returned. Try a clearer search.
                </p>
              )}
            </>
          )}
        </Layout>
      </RelatedUniversesRendererContext>
    </GraphProvider>
  );
}
