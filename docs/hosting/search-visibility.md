# Slugfester search visibility

The preferred site name is **Slugfester** and the canonical homepage is `https://slugfester.com/`. The homepage title and description identify the brand and its AI-assisted debate analysis. `WebSite` structured data supplies the same name, with `slugfester.com` as a fallback. The visible introduction is shared by the initial HTML and interactive homepage.

## Google Search Console

The URL-prefix property is `https://slugfester.com/`. Its public verification token is stored in `config/search-console.json` and emitted in the homepage's `<head>` by the page generator. This token is intended to be public; it is not an API key. Keep the tag after verification so Google can recheck ownership.

Submit `https://slugfester.com/sitemap.xml` in Search Console. After a material homepage change, inspect the canonical homepage and request indexing once. Repeated requests do not accelerate crawling. Search Console performance data, filtered to the query `slugfester`, can show clicks, impressions and average position after data becomes available.

## Observed on 2 November 2026

Google's ordinary search for `slugfester` substituted `slugfest` in the observed browser session. Selecting “Search instead for slugfester” displayed the site among the leading organic results, below a public Facebook mention. This is one observation, not a universal ranking or a promise of future placement. Search results vary by user, location and time.

HTTP, `www`, and `/index.html` homepage variants redirect to the canonical HTTPS homepage. Production is indexable, the sitemap is declared in `robots.txt`, and Cloudflare preview hosts retain `noindex` protection. Do not weaken these controls or introduce keyword stuffing, unsupported review ratings, or invented affiliations.

Google controls spelling substitutions, indexing and rankings. Consistent branding, useful original content and genuine references from other websites can help recognition; page metadata alone cannot guarantee first place. Links from other sites should accurately describe Slugfester and be added only with authorization for those sites.

References: [Google site names](https://developers.google.com/search/docs/appearance/site-names), [title links](https://developers.google.com/search/docs/appearance/title-link), [requesting a recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
