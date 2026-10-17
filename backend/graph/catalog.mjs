import { ServiceError } from "../providers/request-json.mjs";
export function topicRecord(t) {
  return {
    id: t.id,
    label: t.label,
    description: t.description,
    aliases: t.aliases ?? [],
    wikidataId: t.wikidata_id ?? null,
    primaryUniverse: t.primary_universe,
    relatedUniverses: t.related_universes ?? [],
    position: { x: t.map_x, y: t.map_y },
    videoIds: t.video_ids ?? [],
  };
}
export function createGraphCatalog({ store, youtube }) {
  async function neighborhood(universe, topic) {
    const data = await store.snapshot(universe, topic);
    if (
      !data ||
      !Array.isArray(data.topics) ||
      !Array.isArray(data.edges) ||
      !Number.isSafeInteger(data.revision)
    )
      throw new ServiceError(
        "GRAPH_UNAVAILABLE",
        "The learning map could not load. Check the database setup.",
      );
    return { ...data, nodes: data.topics.map(topicRecord), topics: undefined };
  }
  async function topic(universe, id) {
    const data = await neighborhood(universe, id);
    const selected = data.nodes.find((t) => t.id === id);
    if (!selected)
      throw new ServiceError(
        "NOT_FOUND",
        "This topic is not published or is no longer available.",
      );
    let videos = [],
      message = "";
    if (selected.videoIds.length) {
      try {
        videos = await youtube().getPlayableVideos(
          selected.videoIds.slice(0, 6),
        );
      } catch {
        message =
          "The topic is available, but its videos could not load. Try again manually.";
      }
    } else
      message =
        "Learning videos for this topic are awaiting publication. You can still explore its connections or search this topic.";
    return { revision: data.revision, topic: selected, videos, message };
  }
  return { neighborhood, topic };
}
