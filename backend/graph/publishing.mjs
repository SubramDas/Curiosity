import { createHash } from "node:crypto";
import { uuid, universe, videoId, invalid } from "./input.mjs";
function bounded(text, max) {
  if (typeof text !== "string" || !text.trim() || text.length > max)
    invalid("A content field is empty or too long.");
}
function sources(rows, required = false) {
  if (!Array.isArray(rows) || rows.length > 8 || (required && !rows.length))
    invalid("Add reviewed sources.");
  for (const s of rows) {
    bounded(s.title, 200);
    bounded(s.publisher, 120);
    bounded(s.url, 2048);
    const u = new URL(s.url);
    if (u.protocol !== "https:" || u.username || u.password)
      invalid("Use HTTPS source links.");
    if (!Number.isFinite(Date.parse(s.published_at)))
      invalid("Add source publication dates.");
  }
}
export function validateManifest(m, { publishing = false } = {}) {
  if (!m || m.version !== 1) invalid("Use a version 1 graph manifest.");
  uuid(m.request_id);
  if (!Number.isSafeInteger(m.expected_revision) || m.expected_revision < 0)
    invalid();
  bounded(m.summary, 1000);
  if (publishing && m.reviewed !== true)
    invalid(
      "Review the catalog and set reviewed to true before preparing publication.",
    );
  for (const key of ["topics", "edges", "videos", "events", "event_topics"])
    if (!Array.isArray(m[key]) || m[key].length > 1000)
      invalid("Invalid or oversized content batch.");
  const ids = new Set(),
    slugs = new Set(),
    qids = new Set();
  for (const t of m.topics) {
    uuid(t.id);
    bounded(t.slug, 100);
    if (ids.has(t.id) || slugs.has(t.slug))
      invalid("Duplicate topic identity.");
    ids.add(t.id);
    slugs.add(t.slug);
    bounded(t.label, 120);
    bounded(t.description, 1000);
    universe(t.primary_universe);
    if (!["published", "archived", "draft"].includes(t.status)) invalid();
    if (!Array.isArray(t.aliases) || t.aliases.length > 15) invalid();
    t.aliases.forEach((a) => bounded(a, 120));
    if (
      !Array.isArray(t.related_universes) ||
      t.related_universes.length > 2 ||
      new Set(t.related_universes).size !== t.related_universes.length ||
      t.related_universes.includes(t.primary_universe)
    )
      invalid();
    t.related_universes.forEach(universe);
    if (
      ![t.map_x, t.map_y].every(
        (n) => Number.isFinite(n) && Math.abs(n) <= 10000,
      )
    )
      invalid();
    if (t.wikidata_id) {
      if (!/^Q[1-9]\d*$/.test(t.wikidata_id) || qids.has(t.wikidata_id))
        invalid("Duplicate/invalid Wikidata identity.");
      qids.add(t.wikidata_id);
    }
    sources(t.sources);
  }
  const edges = new Set();
  for (const e of m.edges) {
    uuid(e.id);
    if (
      !ids.has(e.from_topic_id) ||
      !ids.has(e.to_topic_id) ||
      e.from_topic_id === e.to_topic_id
    )
      invalid("An edge references a missing topic.");
    if (
      !["related_to", "helps_explain", "part_of", "learn_first"].includes(
        e.relation_type,
      )
    )
      invalid();
    if (e.relation_type === "related_to" && e.from_topic_id > e.to_topic_id)
      invalid("Sort symmetric edge endpoints by ID.");
    const k = [e.from_topic_id, e.to_topic_id, e.relation_type].join(":");
    if (edges.has(k)) invalid("Duplicate connection.");
    edges.add(k);
    bounded(e.explanation, 500);
    sources(e.sources, e.relation_type === "learn_first");
    if (!["published", "archived", "draft"].includes(e.status)) invalid();
  }
  const primaries = new Set(),
    pairs = new Set();
  for (const v of m.videos) {
    if (!ids.has(v.topic_id)) invalid("Video topic missing.");
    videoId(v.video_id);
    if (
      !["primary", "supporting"].includes(v.role) ||
      !["published", "archived", "draft"].includes(v.status)
    )
      invalid();
    const k = v.topic_id + v.video_id;
    if (pairs.has(k)) invalid("Duplicate video association.");
    pairs.add(k);
    if (v.role === "primary" && v.status === "published") {
      if (primaries.has(v.video_id))
        invalid("Each video has one primary topic.");
      primaries.add(v.video_id);
    }
    bounded(v.provenance, 500);
    if (!Number.isFinite(Date.parse(v.checked_at))) invalid();
  }
  const events = new Set();
  for (const e of m.events) {
    uuid(e.id);
    if (events.has(e.id)) invalid("Duplicate event.");
    events.add(e.id);
    bounded(e.title, 180);
    bounded(e.summary, 3000);
    sources(e.sources, true);
    if (
      !["draft", "published", "archived"].includes(e.status) ||
      ![e.published_at, e.updated_at].every((d) =>
        Number.isFinite(Date.parse(d)),
      )
    )
      invalid();
    if (e.status === "archived" && !Number.isFinite(Date.parse(e.archived_at)))
      invalid();
  }
  for (const l of m.event_topics) {
    if (!ids.has(l.topic_id) || !events.has(l.event_id))
      invalid("Event connection is missing an endpoint.");
    bounded(l.explanation, 500);
  }
  return m;
}
export function publicationSql(manifest) {
  validateManifest(manifest, { publishing: true });
  const json = JSON.stringify(manifest),
    checksum = createHash("sha256").update(json).digest("hex");
  return `-- Reviewed graph publication; execute as database owner. No secret keys needed.\nbegin;\nselect public.graph_publish('${json.replaceAll("'", "''")}'::jsonb,'${checksum}');\ncommit;\n`;
}
