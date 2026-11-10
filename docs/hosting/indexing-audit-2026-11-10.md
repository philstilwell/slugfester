# Search Console indexing audit — 10 November 2026

The supplied report matches the live `https://slugfester.com/` Search Console property: 540 indexed URLs and 488 exclusions across six categories (report last updated 5 November). Counts include duplicate addresses and downloads, not just unique content pages.

## Findings and repairs

| Report category | Count | Finding and action |
| --- | ---: | --- |
| Alternate page with proper canonical tag | 400 | All 400 examples have query parameters. These reference/feedback variations intentionally identify their main page as canonical. Keep their contextual behavior and canonical tags. |
| Not found (404) | 2 | `/assessment/` was omitted from the Cloudflare public package without a replacement redirect. Add permanent redirects for its bare, trailing-slash and `index.html` forms to `/backend/`. `/debate/swinburne-` is a truncated, nonexistent address; no internal link points there and several Swinburne debates exist, so retain a genuine 404 rather than guess a destination. |
| Server error (5xx) | 1 | `/reference/fallacy/red-herring/?debate=ayala-barker-biblical-god-2026&page=8` now returns HTTP 200. Google's last recorded failure was 28 October, before the Cloudflare migration. A transient historical error is consistent with this evidence; its original cause is not established. |
| Excluded by noindex | 1 | `/charts/` is a retired copy of Backend, intentionally excluded from indexing. Replace the duplicate response with permanent redirects to `/backend/#charts`, including bare and `index.html` variants. |
| Discovered, currently not indexed | 54 | 14 debate pages and 40 speaker profiles. These are intended content pages. They are available in the current sitemap and initial HTML links. Google has not yet crawled them according to the report. |
| Crawled, currently not indexed | 30 | 26 debate pages, the ambiguity-effect reference page, one parameterized reference duplicate, `feed.xml`, and a downloadable chart JSON snapshot. The 27 content pages are intended for indexing; the feed, data download and duplicate need not appear as separate search results. |

## Verification before publication

- Production marker identified `d062df69bcbe0aebe69f8bec34b499b9865b8418` on Cloudflare Pages.
- Fetched all 546 sitemap URLs over verified HTTPS with four concurrent requests. All returned HTTP 200, a self-referencing canonical and `index,follow`; no mismatches were found.
- Generated-page freshness and public-site validation passed, covering 308 debate pages, 198 speaker profiles, topic navigation, initial HTML content, reference examples, biographies and linked resources.
- Cloudflare package tests passed, including redirect preservation and checks that the destination is published, indexable and contains the `charts` anchor. The built package contains 1,187 files, within the existing free-plan checks.
- The public package continues to omit internal assessment files. No catch-all redirects or indexing blocks were added. Preview-host noindex protection remains intact.

After deployment, verify the public redirects, ask Search Console to recheck the recovered server error and retired charts URL, and resubmit the existing sitemap. These actions request another crawl; they do not guarantee that Google will index every eligible page or immediately update its report. Avoid requesting validation of the normal duplicate exclusions or claiming the incomplete Swinburne address is repaired.

References: [Google's Page indexing report](https://support.google.com/webmasters/answer/7440203?hl=en), [Google's canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Cloudflare Pages redirect syntax](https://developers.cloudflare.com/pages/configuration/redirects/).
