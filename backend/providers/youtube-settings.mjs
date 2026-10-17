import { ServiceError } from "./request-json.mjs";

// Keep a page within the current public-video hydration limit of 20 IDs.
/** @param {string | number} [value] */
export function readYouTubeSearchPageSize(value = 10) {
  const pageSize = Number(value);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 20)
    throw new ServiceError(
      "INVALID_CONFIG",
      "YOUTUBE_SEARCH_PAGE_SIZE must be an integer between 1 and 20.",
    );
  return pageSize;
}
