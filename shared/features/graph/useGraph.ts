import { useEffect, useRef, useState } from "react";
import {
  neighborhood,
  topicDetail,
  graphCall,
  isViewState,
} from "./graph-client";
import { guestView, STATE_KEY } from "./graph-local-state";
import type {
  GraphSnapshot,
  GraphViewState,
  GraphNode,
  TopicDetail,
} from "./graph-types";
const initial: GraphViewState = {
  universe: "science",
  topicId: null,
  view: "map",
  viewport: { x: 0, y: 0, zoom: 1 },
};
export function useGraph(
  token?: string,
  entry?: { id: string; universe: GraphViewState["universe"] },
) {
  const [state, setState] = useState<GraphViewState>(initial),
    [ready, setReady] = useState(false),
    [data, setData] = useState<GraphSnapshot | null>(null),
    [detail, setDetail] = useState<TopicDetail | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [detailError, setDetailError] = useState(""),
    [saveMessage, setSaveMessage] = useState(""),
    [attempt, retry] = useState(0);
  const entryPositioned = useRef(false);
  const saveQueue = useRef(Promise.resolve()),
    current = useRef(true);
  useEffect(() => {
    current.current = true;
    let active = true;
    if (token)
      graphCall<unknown>("state/load", {}, token)
        .then((s) => {
          if (active && isViewState(s) && !entry) setState(s);
        })
        .catch(() => {
          if (active) setSaveMessage("Your last map position could not load.");
        })
        .finally(() => {
          if (active) {
            if (entry)
              setState({
                ...initial,
                universe: entry.universe,
                topicId: entry.id,
              });
            setReady(true);
          }
        });
    else {
      setState(
        entry
          ? { ...initial, universe: entry.universe, topicId: entry.id }
          : (guestView() ?? initial),
      );
      setReady(true);
    }
    return () => {
      active = false;
      current.current = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setBusy(true);
    setError("");
    setDetail(null);
    setData(null);
    neighborhood(state.universe, state.topicId ?? undefined)
      .then((s) => {
        if (!active) return;
        setData(s);
        const entryNode = entry && s.nodes.find((n) => n.id === entry.id);
        if (entryNode && !entryPositioned.current) {
          entryPositioned.current = true;
          setState((v) => ({
            ...v,
            view: "map",
            viewport: {
              x: 300 - entryNode.position.x,
              y: 300 - entryNode.position.y,
              zoom: 1,
            },
          }));
        }
        if (state.topicId && !s.nodes.some((n) => n.id === state.topicId)) {
          setSaveMessage(
            "Your previous topic is unavailable. Choose a nearby topic.",
          );
          setState((v) => ({ ...v, topicId: null }));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [state.universe, state.topicId, ready, attempt]);
  useEffect(() => {
    if (!ready || !data || !state.topicId) return;
    let active = true;
    setDetail(null);
    setDetailError("");
    topicDetail(state.universe, state.topicId)
      .then((d) => {
        if (!active) return;
        if (d.revision !== data.revision) {
          setDetailError(
            "The map has changed. Refresh this neighborhood before starting.",
          );
          return;
        }
        setDetail(d);
      })
      .catch((e) => {
        if (active) setDetailError(e.message);
      });
    return () => {
      active = false;
    };
  }, [state.topicId, state.universe, data, ready, attempt]);
  useEffect(() => {
    if (!ready || !data) return;
    const timer = setTimeout(() => {
      if (token) {
        saveQueue.current = saveQueue.current
          .then(async () => {
            if (!current.current) return;
            await graphCall("state/save", state, token);
            if (current.current) setSaveMessage("");
          })
          .catch(() => {
            if (current.current)
              setSaveMessage("Your map position has not synced.");
          });
      } else {
        try {
          localStorage.setItem(STATE_KEY, JSON.stringify(state));
          setSaveMessage("");
        } catch {
          setSaveMessage("Your map position cannot be saved in this browser.");
        }
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [state, ready, data, token]);
  const select = (node: GraphNode) => {
    setDetail(null);
    setState((s) => ({
      ...s,
      universe: node.primaryUniverse,
      topicId: node.id,
      viewport:
        node.primaryUniverse === s.universe &&
        node.position.x * s.viewport.zoom + s.viewport.x > 70 &&
        node.position.x * s.viewport.zoom + s.viewport.x < 930 &&
        node.position.y * s.viewport.zoom + s.viewport.y > 70 &&
        node.position.y * s.viewport.zoom + s.viewport.y < 580
          ? s.viewport
          : { x: 500 - node.position.x, y: 300 - node.position.y, zoom: 1 },
    }));
  };
  return {
    state,
    setState,
    data,
    detail,
    busy,
    error,
    detailError,
    saveMessage,
    select,
    retry: () => retry((n) => n + 1),
  };
}
