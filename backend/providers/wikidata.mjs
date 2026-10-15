import { requestJson, ServiceError } from "./request-json.mjs";

const itemId = /^Q[1-9]\d*$/;
const relations = {
  P31: "instance of",
  P279: "subclass of",
  P361: "part of",
  P2578: "studies",
  P101: "field of work",
};
export function createWikidataClient({ cache, fetchRequest = fetch }) {
  let cooldownUntil = 0;
  async function call(parameters, signal) {
    if (Date.now() < cooldownUntil)
      throw new ServiceError("SERVICE_LIMIT", "Wikidata is temporarily busy.");
    const url = new URL("https://www.wikidata.org/w/api.php");
    url.search = new URLSearchParams({
      format: "json",
      maxlag: "5",
      ...parameters,
    }).toString();
    let retryDelay = 5000;
    const data = await requestJson(
      url,
      {
        headers: {
          "User-Agent":
            "Curiosity/1.0 (https://curiosity-u2ubbw6fra-el.a.run.app/demo-info.html; educational topic matching)",
          Accept: "application/json",
        },
      },
      async (url, options) => {
        const response = await fetchRequest(url, {
          ...options,
          signal: AbortSignal.any([options.signal, signal]),
        });
        const seconds = Number(response.headers.get("retry-after"));
        if (seconds > 0 && Number.isFinite(seconds))
          retryDelay = Math.max(5000, seconds * 1000);
        if (response.status === 429)
          cooldownUntil = Date.now() + Math.max(60_000, retryDelay);
        return response;
      },
    );
    if (data.error) {
      if (data.error.code === "maxlag") cooldownUntil = Date.now() + retryDelay;
      throw new ServiceError(
        "SERVICE_ERROR",
        "Wikidata is temporarily unavailable.",
      );
    }
    return data;
  }
  async function entities(ids, props, signal) {
    if (!ids.length) return {};
    const data = await call(
      { action: "wbgetentities", ids: ids.join("|"), languages: "en", props },
      signal,
    );
    if (!data.entities || typeof data.entities !== "object")
      throw new ServiceError(
        "INVALID_RESPONSE",
        "Wikidata returned incomplete concepts.",
      );
    return data.entities;
  }
  return {
    async findCandidates(topic, aliases = []) {
      const terms = [...new Set([topic, ...aliases])].slice(0, 3);
      if (
        terms.some(
          (term) =>
            typeof term !== "string" || !term.trim() || term.length > 100,
        )
      )
        throw new ServiceError(
          "INVALID_INPUT",
          "Use a short topic for Wikidata lookup.",
        );
      return cache.getOrLoad(
        ["wikidata-candidates-v1", ...terms],
        6 * 3600_000,
        async () => {
          const signal = AbortSignal.timeout(15_000);
          const ids = [];
          // Sequential, bounded requests avoid bursts against the public endpoint.
          for (const term of terms) {
            const page = await call(
              {
                action: "wbsearchentities",
                search: term,
                language: "en",
                uselang: "en",
                type: "item",
                limit: "3",
              },
              signal,
            );
            if (!Array.isArray(page.search))
              throw new ServiceError(
                "INVALID_RESPONSE",
                "Wikidata returned an invalid search response.",
              );
            for (const row of page.search)
              if (itemId.test(row.id) && !ids.includes(row.id))
                ids.push(row.id);
          }
          const records = await entities(
            ids.slice(0, 6),
            "labels|descriptions|aliases|claims",
            signal,
          );
          const candidates = ids.slice(0, 6).flatMap((id) => {
            const entity = records[id];
            if (!entity?.labels?.en?.value || entity.missing !== undefined)
              return [];
            return [
              {
                id,
                label: entity.labels.en.value.slice(0, 200),
                description: (entity.descriptions?.en?.value ?? "").slice(
                  0,
                  500,
                ),
                aliases: (entity.aliases?.en ?? [])
                  .slice(0, 5)
                  .map((row) => row.value.slice(0, 100)),
                relationships: Object.entries(relations).flatMap(
                  ([property, relation]) =>
                    (entity.claims?.[property] ?? [])
                      .filter((claim) => claim.rank !== "deprecated")
                      .slice(0, 2)
                      .flatMap((claim) => {
                        const targetId = claim.mainsnak?.datavalue?.value?.id;
                        return itemId.test(targetId ?? "")
                          ? [{ property, relation, targetId }]
                          : [];
                      }),
                ),
              },
            ];
          });
          const targetIds = [
            ...new Set(
              candidates.flatMap((candidate) =>
                candidate.relationships.map((row) => row.targetId),
              ),
            ),
          ].slice(0, 30);
          const targets = await entities(
            targetIds,
            "labels|descriptions",
            signal,
          );
          return candidates.map((candidate) => ({
            ...candidate,
            relationships: candidate.relationships.map((row) => ({
              ...row,
              label: (
                targets[row.targetId]?.labels?.en?.value ?? row.targetId
              ).slice(0, 200),
              description: (
                targets[row.targetId]?.descriptions?.en?.value ?? ""
              ).slice(0, 300),
            })),
          }));
        },
      );
    },
  };
}
