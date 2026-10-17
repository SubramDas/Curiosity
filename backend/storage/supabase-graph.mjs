// Application services depend on these small operations, not on REST details.
export function createSupabaseGraphStore(rpc) {
  return {
    snapshot: (universe, topic) =>
      rpc("graph_snapshot", { p_universe: universe, p_topic: topic }),
    videoMatch: (id) => rpc("graph_video_match", { p_video: id }),
    progress: (token) => rpc("graph_progress", {}, token),
    discover: (topic, token) =>
      rpc("graph_discover", { p_topic: topic }, token),
    start: (topic, video, replace, request, token) =>
      rpc(
        "graph_activity_start",
        {
          p_topic: topic,
          p_video: video,
          p_replace: replace,
          p_request: request,
        },
        token,
      ),
    stop: (session, token) =>
      rpc("graph_activity_stop", { p_session: session }, token),
    report: (session, sequence, elapsed, token) =>
      rpc(
        "graph_activity_report",
        { p_session: session, p_sequence: sequence, p_elapsed: elapsed },
        token,
      ),
    loadState: (token) => rpc("graph_state_load", {}, token),
    saveState: (state, token) =>
      rpc("graph_state_save", { p_state: state }, token),
  };
}
