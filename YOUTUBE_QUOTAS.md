# YouTube quota labels

Checked against Google's official documentation on 2026-10-14. Your project's Google Cloud console shows its actual allocated limits and overrides.

| Google Cloud label | What it controls |
| --- | --- |
| Search queries per day | Calls to `search.list`. The current documented default is 100 calls per project per day, in a separate search bucket. Loading another result page is another call. |
| Queries per day | Daily quota units for the other endpoints, excluding the separate search/upload buckets. The documented default is 10,000 units per day. Methods have different costs; `videos.list` costs one unit per request, including a valid batch of IDs. |
| Queries per minute | The request-rate allowance for that quota metric during a minute. It limits bursts; unused minute capacity does not increase the daily allowance. Check the metric's scope and value in the console. |

Google's current quota guide explicitly describes separate search/upload buckets with one unit per call within those buckets. Older articles describing searches as 100 units from a shared 10,000-unit bucket do not describe the current documented model. [YouTube quota guide](https://developers.google.com/youtube/v3/determine_quota_cost), [API overview](https://developers.google.com/youtube/v3/getting-started).

Per-minute limits are rate limits, separate from the daily budget. [Google Cloud quota overview](https://docs.cloud.google.com/docs/quotas/overview).

## Examples in this app

- A new topic-search page uses one `search.list` call and a batched `videos.list` lookup for its details. Fresh cached details can avoid the lookup.
- Loading another uncached result page uses another search call.
- Uncached Trending currently uses two search calls (regular videos and short videos) plus a details lookup.
- Returning an unexpired cached response uses no YouTube call and consumes no Google quota.

The app's `SEARCH_DAILY_LIMIT` is an independent conservative local safeguard shared by feed/search/detail activity. It does not read Google's remaining quotas or reproduce its separate buckets. It reserves allowance before uncached operations, so failed provider attempts can consume local allowance too. Caching does not erase earlier usage.

YouTube's daily quotas reset at midnight Pacific Time. The local limiter resets at midnight UTC (5:30 AM in India).

## Cached data

This app refreshes/expires search and video metadata after six hours and Trending after one hour. It does not download or cache video/audio files. Stored non-authorized API data must be refreshed or deleted within the period specified by YouTube; the current developer policy specifies 30 calendar days. Our expiry is much shorter. [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies).
