// Vercel serverless function: same-origin proxy for the live
// founder counter. Sits at /api/lifetime-remaining on oraqelcode.com
// and fetches the real number from oraqelapp.com server-side, then
// returns it to the browser. This sidesteps the CORS issue on the
// upstream API (which doesn't currently set Access-Control-Allow-Origin).
//
// Caches at the Vercel edge for 30s so we don't hammer the upstream:
// every visitor in the same 30s window gets the same cached response,
// then it revalidates lazily in the background. Stale-while-revalidate
// keeps the page snappy even when the upstream is slow.
//
// Once the upstream API on oraqelapp.com adds CORS headers, this proxy
// can be removed and the page can fetch the upstream directly.

export default async function handler(req, res) {
  try {
    const r = await fetch(
      'https://www.oraqelapp.com/api/lifetime-remaining',
      { cache: 'no-store' }
    );
    if (!r.ok) {
      res.status(502).json({ error: 'upstream_unhealthy', status: r.status });
      return;
    }
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    res.status(200).json(data);
  } catch (err) {
    // On failure, return 503 with no body changes. The client falls
    // back to its last known good value (the data-base seed).
    res.status(503).json({ error: 'upstream_unreachable' });
  }
}
