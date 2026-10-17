import { ServiceError } from "../providers/request-json.mjs";

export function createFirestoreUsage({
  database,
  namespace = "curiosity",
  now = Date.now,
}) {
  return {
    async reserve(kind, limit, count = 1) {
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100 ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > 100 ||
        ![
          "search",
          "chat",
          "videoChat",
          "classification",
          "searchGuard",
        ].includes(kind)
      )
        throw new ServiceError(
          "INVALID_CONFIG",
          "Invalid service allowance settings.",
        );
      const day = new Date(now()).toISOString().slice(0, 10);
      const record = database.doc(`${namespace}_usage/${day}`);
      await database.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(record);
        const used = snapshot.data()?.[kind] ?? 0;
        if (!Number.isInteger(used) || used < 0)
          throw new ServiceError(
            "INVALID_CONFIG",
            "The service usage record is invalid.",
          );
        if (used + count > limit)
          throw new ServiceError(
            "LOCAL_LIMIT",
            `Today's ${kind === "videoChat" ? "video-analysis" : kind} allowance is used. Try again tomorrow.`,
          );
        transaction.set(record, { [kind]: used + count }, { merge: true });
      });
    },
  };
}
